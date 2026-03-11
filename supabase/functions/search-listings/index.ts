import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchFilters {
  condition?: string;
  source?: string;
  maxPrice?: number;
  shippingIncluded?: boolean;
}

interface NormalizedListing {
  source: string;
  externalUrl: string;
  externalId: string;
  title: string;
  imageUrl: string;
  price: number;
  shippingPrice: number;
  condition: string;
  sellerName?: string;
  sellerRating?: number | null;
  location?: string;
  description?: string;
  category?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','for','with','in','on','at','to','of',
  'brand','new','listing','sale','used','oem','genuine','authentic',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-.]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

function normalizeCondition(raw?: string): string {
  if (!raw) return 'Good';
  const lower = raw.toLowerCase();
  if (lower.includes('like new') || lower.includes('mint') || lower.includes('excellent') || lower.includes('open box')) return 'Like New';
  if (lower.includes('new')) return 'New';
  if (lower.includes('good')) return 'Good';
  if (lower.includes('fair') || lower.includes('acceptable') || lower.includes('average')) return 'Fair';
  if (lower.includes('poor') || lower.includes('parts') || lower.includes('damaged')) return 'Poor';
  return 'Good';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeDealScore(totalPrice: number, allPrices: number[], count: number) {
  const med = median(allPrices);
  const pctBelow = med > 0 ? (med - totalPrice) / med : 0;
  const confidence = count >= 5 ? 'High' : count >= 3 ? 'Medium' : 'Low';

  let dealScore: string;
  if (pctBelow > 0.2 && confidence !== 'Low') dealScore = 'Strong';
  else if (pctBelow > 0.1 && confidence !== 'Low') dealScore = 'Good';
  else if (pctBelow > 0.05) dealScore = 'Possible';
  else dealScore = 'None';

  let flagReason = '';
  if (dealScore === 'Strong') {
    flagReason = confidence === 'High'
      ? 'Priced well below similar live listings'
      : 'Lower total price than most comparable listings, including shipping';
  } else if (dealScore === 'Good') {
    flagReason = pctBelow > 0.15
      ? 'Strong price relative to similar condition listings'
      : 'Below the typical price range for this item';
  } else if (dealScore === 'Possible') {
    flagReason = 'Could be a deal, but listing details are limited';
  }

  return {
    dealScore,
    confidenceScore: confidence,
    estimatedSavings: Math.max(0, med - totalPrice),
    flagReason,
    flagged: dealScore !== 'None',
    medianPrice: med,
  };
}

function safeParsePrice(val: unknown): number {
  const str = String(val ?? '0').replace(/[^0-9.]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ─── eBay Browse API ──────────────────────────────────────────────────────────

async function getEbayToken(appId: string, certId: string): Promise<string> {
  const credentials = btoa(`${appId}:${certId}`);
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`eBay OAuth failed: ${data.error_description ?? 'Unknown'}`);
  return data.access_token as string;
}

async function fetchEbay(query: string, filters: SearchFilters): Promise<NormalizedListing[]> {
  const appId = Deno.env.get('EBAY_APP_ID');
  const certId = Deno.env.get('EBAY_CERT_ID');
  if (!appId || !certId) {
    console.warn('[eBay] EBAY_APP_ID or EBAY_CERT_ID not set — skipping');
    return [];
  }

  const token = await getEbayToken(appId, certId);

  const params = new URLSearchParams({ q: query, limit: '20' });
  const condMap: Record<string, string> = {
    'New': '1000', 'Like New': '2500', 'Good': '3000', 'Fair': '4000', 'Poor': '7000',
  };
  const filterParts: string[] = [];
  if (filters.condition && condMap[filters.condition]) {
    filterParts.push(`conditionIds:{${condMap[filters.condition]}}`);
  }
  if (filters.maxPrice) {
    filterParts.push(`price:[..${filters.maxPrice}],priceCurrency:USD`);
  }
  if (filterParts.length > 0) params.set('filter', filterParts.join(','));

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const items: Record<string, unknown>[] = data.itemSummaries ?? [];

  return items.map(item => {
    const priceObj = item.price as Record<string, string> | undefined;
    const shippingOpts = item.shippingOptions as Array<Record<string, unknown>> | undefined;
    const firstShip = shippingOpts?.[0];
    const shippingPrice = firstShip?.shippingCostType === 'FREE' ? 0
      : safeParsePrice((firstShip?.shippingCost as Record<string, string> | undefined)?.value);
    const seller = item.seller as Record<string, unknown> | undefined;
    const images = item.thumbnailImages as Array<Record<string, string>> | undefined;
    const itemLoc = item.itemLocation as Record<string, string> | undefined;

    return {
      source: 'eBay',
      externalUrl: (item.itemWebUrl ?? '') as string,
      externalId: (item.itemId ?? '') as string,
      title: (item.title ?? '') as string,
      imageUrl: images?.[0]?.imageUrl ?? (item.image as Record<string, string> | undefined)?.imageUrl ?? '',
      price: safeParsePrice(priceObj?.value),
      shippingPrice,
      condition: normalizeCondition(item.condition as string),
      sellerName: (seller?.username ?? '') as string,
      sellerRating: seller?.feedbackPercentage
        ? Math.round(parseFloat(seller.feedbackPercentage as string) / 20 * 10) / 10
        : null,
      location: itemLoc ? `${itemLoc.city ?? ''}, ${itemLoc.stateOrProvince ?? ''}`.replace(/^, |, $/, '') : '',
      description: (item.shortDescription ?? '') as string,
      category: (item.categories as Array<Record<string, string>> | undefined)?.[0]?.categoryName ?? '',
    } satisfies NormalizedListing;
  });
}

// ─── Apify helper ─────────────────────────────────────────────────────────────

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  token: string,
  timeoutSecs = 20,
): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=512`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 5) * 1000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify [${actorId}] ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Mercari (Apify: parseforge/mercari-scraper) ──────────────────────────────

async function fetchMercari(query: string, _filters: SearchFilters): Promise<NormalizedListing[]> {
  const token = Deno.env.get('APIFY_API_TOKEN');
  if (!token) { console.warn('[Mercari] APIFY_API_TOKEN not set — skipping'); return []; }

  const items = await runApifyActor('parseforge~mercari-scraper', {
    searchQuery: query,
    maxItems: 15,
    status: 'on_sale',
  }, token);

  return items
    .filter(item => item.name || item.title)
    .map(item => {
      const price = safeParsePrice(item.price);
      const seller = item.seller as Record<string, unknown> | undefined;
      return {
        source: 'Mercari',
        externalUrl: (item.url ?? '') as string,
        externalId: (item.id ?? String(Math.random())) as string,
        title: ((item.name ?? item.title ?? '') as string),
        imageUrl: (item.thumbnailUrl ?? item.photo ?? '') as string,
        price,
        shippingPrice: 0,
        condition: normalizeCondition((item.condition ?? item.itemCondition) as string),
        sellerName: (seller?.name ?? item.sellerName ?? '') as string,
        sellerRating: null,
        location: '',
        description: (item.description ?? '') as string,
        category: (item.category ?? '') as string,
      } satisfies NormalizedListing;
    });
}

// ─── Facebook Marketplace (Apify: apify/facebook-marketplace-scraper) ─────────

async function fetchFacebookMarketplace(query: string, filters: SearchFilters): Promise<NormalizedListing[]> {
  const token = Deno.env.get('APIFY_API_TOKEN');
  if (!token) { console.warn('[Facebook Marketplace] APIFY_API_TOKEN not set — skipping'); return []; }

  const input: Record<string, unknown> = {
    searchTerms: [query],
    maxItems: 15,
    countryCode: 'US',
  };
  if (filters.maxPrice) input.maxPrice = Number(filters.maxPrice);

  const items = await runApifyActor('apify~facebook-marketplace-scraper', input, token);

  return items
    .filter(item => item.title)
    .map(item => {
      const price = safeParsePrice(item.price);
      const primaryPhoto = item.primaryPhoto as Record<string, string> | undefined;
      const location = item.location as Record<string, string> | undefined;
      return {
        source: 'Facebook Marketplace',
        externalUrl: (item.url ?? '') as string,
        externalId: (item.id ?? '') as string,
        title: (item.title ?? '') as string,
        imageUrl: primaryPhoto?.uri ?? (item.imageUrl ?? '') as string,
        price,
        shippingPrice: 0,
        condition: normalizeCondition(item.condition as string),
        sellerName: (item.sellerName ?? '') as string,
        sellerRating: null,
        location: location?.city ?? (item.locationText ?? '') as string,
        description: (item.description ?? '') as string,
        category: (item.category ?? '') as string,
      } satisfies NormalizedListing;
    });
}

// ─── OfferUp (Apify: caxef/offerup-scraper) ───────────────────────────────────

async function fetchOfferUp(query: string, _filters: SearchFilters): Promise<NormalizedListing[]> {
  const token = Deno.env.get('APIFY_API_TOKEN');
  if (!token) { console.warn('[OfferUp] APIFY_API_TOKEN not set — skipping'); return []; }

  const items = await runApifyActor('caxef~offerup-scraper', {
    searchTerm: query,
    maxItems: 15,
    postalCode: '10001',
    radius: 100,
  }, token);

  return items
    .filter(item => item.title)
    .map(item => {
      const price = safeParsePrice(item.price);
      const seller = item.seller as Record<string, unknown> | undefined;
      return {
        source: 'OfferUp',
        externalUrl: (item.url ?? `https://offerup.com/item/detail/${item.id}`) as string,
        externalId: String(item.id ?? Math.random()),
        title: (item.title ?? '') as string,
        imageUrl: (item.picUrl ?? item.imageUrl ?? '') as string,
        price,
        shippingPrice: 0,
        condition: normalizeCondition(item.condition as string),
        sellerName: (seller?.name ?? '') as string,
        sellerRating: (seller?.rating ?? null) as number | null,
        location: (item.location ?? '') as string,
        description: (item.description ?? '') as string,
        category: (item.category ?? '') as string,
      } satisfies NormalizedListing;
    });
}

// ─── Google Shopping (SerpAPI) ────────────────────────────────────────────────

async function fetchGoogleShopping(query: string, filters: SearchFilters): Promise<NormalizedListing[]> {
  const apiKey = Deno.env.get('SERPAPI_KEY');
  if (!apiKey) { console.warn('[Google Shopping] SERPAPI_KEY not set — skipping'); return []; }

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: apiKey,
    num: '20',
    gl: 'us',
    hl: 'en',
  });
  if (filters.maxPrice) params.set('tbs', `mr:1,price:1,ppr_max:${filters.maxPrice}`);

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
  const data = await res.json();
  const results: Record<string, unknown>[] = data.shopping_results ?? [];

  return results.slice(0, 20).map((item, idx) => ({
    source: 'Google Shopping',
    externalUrl: (item.link ?? '') as string,
    externalId: (item.product_id ?? String(item.position ?? idx)) as string,
    title: (item.title ?? '') as string,
    imageUrl: (item.thumbnail ?? '') as string,
    price: safeParsePrice(item.price),
    shippingPrice: 0,
    condition: 'New',
    sellerName: (item.source ?? '') as string,
    sellerRating: item.rating ? parseFloat(String(item.rating)) : null,
    location: '',
    description: (item.snippet ?? '') as string,
    category: '',
  } satisfies NormalizedListing));
}

// ─── Apply client-side filters ────────────────────────────────────────────────

function applyFilters(listings: NormalizedListing[], filters: SearchFilters): NormalizedListing[] {
  let result = listings;
  if (filters.condition) result = result.filter(l => l.condition === filters.condition);
  if (filters.source) result = result.filter(l => l.source === filters.source);
  if (filters.maxPrice) result = result.filter(l => (l.price + l.shippingPrice) <= Number(filters.maxPrice));
  if (filters.shippingIncluded) result = result.filter(l => l.shippingPrice === 0);
  return result;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json();
    const query: string = body.query ?? '';
    const filters: SearchFilters = body.filters ?? {};

    if (!query.trim()) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[search-listings] query="${query}" filters=${JSON.stringify(filters)}`);

    // ── Fetch all sources in parallel ─────────────────────────────────────────
    const [eBayRes, mercariRes, fbRes, offerUpRes, googleRes] = await Promise.allSettled([
      fetchEbay(query, filters),
      fetchMercari(query, filters),
      fetchFacebookMarketplace(query, filters),
      fetchOfferUp(query, filters),
      fetchGoogleShopping(query, filters),
    ]);

    const allListings: NormalizedListing[] = [];
    const sourceErrors: Record<string, string> = {};
    const sourceMeta: Record<string, number> = {};

    for (const [name, result] of [
      ['eBay', eBayRes],
      ['Mercari', mercariRes],
      ['Facebook Marketplace', fbRes],
      ['OfferUp', offerUpRes],
      ['Google Shopping', googleRes],
    ] as Array<[string, PromiseSettledResult<NormalizedListing[]>]>) {
      if (result.status === 'fulfilled') {
        console.log(`[${name}] ${result.value.length} results`);
        allListings.push(...result.value);
        sourceMeta[name] = result.value.length;
      } else {
        const msg = (result.reason as Error)?.message ?? 'Unknown error';
        console.error(`[${name}] Error: ${msg}`);
        sourceErrors[name] = msg;
        sourceMeta[name] = 0;
      }
    }

    // Apply additional client-side filters not handled at source level
    const filtered = applyFilters(allListings, filters);

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          listings: [],
          evaluations: [],
          comparableGroups: [],
          sourceErrors,
          meta: { totalResults: 0, sources: sourceMeta },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Compute deal scores ───────────────────────────────────────────────────
    const allTotalPrices = filtered.map(l => l.price + l.shippingPrice);
    const med = median(allTotalPrices);
    const lowPrice = Math.min(...allTotalPrices);
    const highPrice = Math.max(...allTotalPrices);
    const normalizedQuery = normalizeText(query);

    // ── Upsert comparable group ───────────────────────────────────────────────
    const { data: groupData } = await supabase
      .from('comparable_groups')
      .upsert(
        {
          canonical_product_name: normalizedQuery,
          normalized_attributes: { originalQuery: query },
          median_price: med,
          low_price: lowPrice,
          high_price: highPrice,
        },
        { onConflict: 'canonical_product_name' }
      )
      .select('id, canonical_product_name, median_price, low_price, high_price')
      .single();

    const groupId: string | null = groupData?.id ?? null;

    // ── Upsert listings ───────────────────────────────────────────────────────
    const listingRows = filtered.map(l => ({
      source: l.source,
      external_url: l.externalUrl,
      external_id: l.externalId || `${l.source}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: l.title || 'Untitled',
      normalized_title: normalizeText(l.title || ''),
      image_url: l.imageUrl || null,
      price: l.price,
      shipping_price: l.shippingPrice,
      currency: 'USD',
      condition: l.condition,
      seller_name: l.sellerName || null,
      seller_rating: l.sellerRating ?? null,
      location: l.location || null,
      description: l.description || null,
      category: l.category || null,
      posted_at: new Date().toISOString(),
    }));

    const { data: upsertedListings } = await supabase
      .from('listings')
      .upsert(listingRows, { onConflict: 'source,external_id' })
      .select('id, source, external_id, price, shipping_price, title, normalized_title, image_url, condition, seller_name, seller_rating, location, description, category, created_at, posted_at, external_url, currency');

    const insertedListings = upsertedListings ?? [];
    const listingIds = insertedListings.map((r: Record<string, unknown>) => r.id as string);

    // ── Upsert deal evaluations ───────────────────────────────────────────────
    const evalRows = insertedListings.map((row: Record<string, unknown>) => {
      const totalPrice = (parseFloat(String(row.price)) || 0) + (parseFloat(String(row.shipping_price)) || 0);
      const scoring = computeDealScore(totalPrice, allTotalPrices, filtered.length);
      return {
        listing_id: row.id as string,
        comparable_group_id: groupId,
        deal_score: scoring.dealScore,
        confidence_score: scoring.confidenceScore,
        estimated_savings: scoring.estimatedSavings,
        flag_reason: scoring.flagReason,
        flagged: scoring.flagged,
      };
    });

    await supabase
      .from('deal_evaluations')
      .upsert(evalRows, { onConflict: 'listing_id' });

    // ── Fetch final evaluations ───────────────────────────────────────────────
    const { data: finalEvals } = await supabase
      .from('deal_evaluations')
      .select('id, listing_id, comparable_group_id, deal_score, confidence_score, estimated_savings, flag_reason, flagged')
      .in('listing_id', listingIds);

    // ── Transform to camelCase for frontend ───────────────────────────────────
    const frontendListings = insertedListings.map((row: Record<string, unknown>) => ({
      id: row.id,
      source: row.source,
      externalUrl: row.external_url,
      title: row.title,
      normalizedTitle: row.normalized_title,
      imageUrl: row.image_url ?? '',
      price: parseFloat(String(row.price)) || 0,
      shippingPrice: parseFloat(String(row.shipping_price)) || 0,
      totalPrice: (parseFloat(String(row.price)) || 0) + (parseFloat(String(row.shipping_price)) || 0),
      currency: 'USD',
      condition: row.condition,
      sellerName: row.seller_name ?? '',
      sellerRating: row.seller_rating ?? null,
      location: row.location ?? '',
      description: row.description ?? '',
      createdAt: row.created_at,
      postedAt: row.posted_at,
      category: row.category ?? '',
    }));

    const frontendEvals = (finalEvals ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      listingId: e.listing_id,
      comparableGroupId: e.comparable_group_id,
      dealScore: e.deal_score,
      confidenceScore: e.confidence_score,
      estimatedSavings: parseFloat(String(e.estimated_savings)) || 0,
      flagReason: e.flag_reason ?? '',
      flagged: e.flagged,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        listings: frontendListings,
        evaluations: frontendEvals,
        comparableGroups: groupData ? [{
          id: groupData.id,
          canonicalProductName: groupData.canonical_product_name,
          medianPrice: groupData.median_price,
          lowPrice: groupData.low_price,
          highPrice: groupData.high_price,
        }] : [],
        sourceErrors,
        meta: {
          totalResults: filtered.length,
          sources: sourceMeta,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[search-listings] Fatal error:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
