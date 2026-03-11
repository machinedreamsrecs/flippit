import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache TTL: serve DB results for up to 30 minutes before hitting APIs again
const CACHE_TTL_MS = 30 * 60 * 1000;

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

// ─── Deal scoring — sold comps as primary baseline ────────────────────────────

function computeDealScore(
  totalPrice: number,
  activePrices: number[],
  soldPrices: number[],
) {
  const usingSoldComps = soldPrices.length >= 2;
  const comps = usingSoldComps ? soldPrices : activePrices;
  const med = median(comps);
  const pctBelow = med > 0 ? (med - totalPrice) / med : 0;
  const confidence = comps.length >= 5 ? 'High' : comps.length >= 3 ? 'Medium' : 'Low';

  let dealScore: string;
  if (pctBelow > 0.2 && confidence !== 'Low') dealScore = 'Strong';
  else if (pctBelow > 0.1 && confidence !== 'Low') dealScore = 'Good';
  else if (pctBelow > 0.05) dealScore = 'Possible';
  else dealScore = 'None';

  let flagReason = '';
  if (dealScore === 'Strong') {
    flagReason = usingSoldComps
      ? 'Priced well below recent sold prices for this item'
      : confidence === 'High'
        ? 'Priced well below similar live listings'
        : 'Lower total price than most comparable listings, including shipping';
  } else if (dealScore === 'Good') {
    flagReason = usingSoldComps
      ? `Listed ${Math.round(pctBelow * 100)}% below the recent average sold price`
      : pctBelow > 0.15
        ? 'Strong price relative to similar condition listings'
        : 'Below the typical price range for this item';
  } else if (dealScore === 'Possible') {
    flagReason = usingSoldComps
      ? 'Slightly below recent sold prices — could be a deal'
      : 'Could be a deal, but listing details are limited';
  }

  return {
    dealScore,
    confidenceScore: confidence,
    estimatedSavings: Math.max(0, med - totalPrice),
    flagReason,
    flagged: dealScore !== 'None',
    medianPrice: med,
    usingSoldComps,
  };
}

function safeParsePrice(val: unknown): number {
  const str = String(val ?? '0').replace(/[^0-9.]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ─── eBay OAuth token ─────────────────────────────────────────────────────────

async function getEbayToken(appId: string, certId: string): Promise<string> {
  const credentials = btoa(`${appId}:${certId}`);
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials' +
      '&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope' +
      '%20https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope%2Fbuy.marketplace.insights',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`eBay OAuth failed: ${data.error_description ?? 'Unknown'}`);
  return data.access_token as string;
}

// ─── eBay Browse API (active listings) ───────────────────────────────────────

async function fetchEbay(query: string, filters: SearchFilters, token: string): Promise<NormalizedListing[]> {
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
    { headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Browse ${res.status}: ${text.slice(0, 300)}`);
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

// ─── eBay Marketplace Insights API (recently sold) ────────────────────────────

async function fetchEbaySoldComps(query: string, token: string): Promise<number[]> {
  const params = new URLSearchParams({ q: query, limit: '50' });
  const res = await fetch(
    `https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?${params}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Insights ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const sales: Record<string, unknown>[] = data.itemSales ?? [];
  return sales
    .map(s => safeParsePrice((s.lastSoldPrice as Record<string, string> | undefined)?.value))
    .filter(p => p > 0);
}

// ─── Apify helper ─────────────────────────────────────────────────────────────

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  token: string,
  timeoutSecs = 12,  // reduced from 20 → faster failures, actors usually done in <8s
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

// ─── Mercari active listings (Apify) ─────────────────────────────────────────

async function fetchMercari(query: string, _filters: SearchFilters, token: string): Promise<NormalizedListing[]> {
  const items = await runApifyActor('parseforge~mercari-scraper', {
    searchQuery: query, maxItems: 12, status: 'on_sale',
  }, token);

  return items
    .filter(item => item.name || item.title)
    .map(item => {
      const seller = item.seller as Record<string, unknown> | undefined;
      return {
        source: 'Mercari',
        externalUrl: (item.url ?? '') as string,
        externalId: (item.id ?? String(Math.random())) as string,
        title: ((item.name ?? item.title ?? '') as string),
        imageUrl: (item.thumbnailUrl ?? item.photo ?? '') as string,
        price: safeParsePrice(item.price),
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

// ─── Mercari sold comps (Apify — same actor, status:'sold') ───────────────────

async function fetchMercariSoldComps(query: string, token: string): Promise<number[]> {
  const items = await runApifyActor('parseforge~mercari-scraper', {
    searchQuery: query, maxItems: 15, status: 'sold',
  }, token);
  return items
    .map(item => safeParsePrice(item.price))
    .filter(p => p > 0);
}

// ─── Facebook Marketplace (Apify) ────────────────────────────────────────────

async function fetchFacebookMarketplace(query: string, filters: SearchFilters, token: string): Promise<NormalizedListing[]> {
  const input: Record<string, unknown> = {
    searchTerms: [query], maxItems: 8, countryCode: 'US',
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

// ─── OfferUp (Apify) ──────────────────────────────────────────────────────────

async function fetchOfferUp(query: string, _filters: SearchFilters, token: string): Promise<NormalizedListing[]> {
  const items = await runApifyActor('caxef~offerup-scraper', {
    searchTerm: query, maxItems: 8, postalCode: '10001', radius: 100,
  }, token);

  return items
    .filter(item => item.title)
    .map(item => {
      const seller = item.seller as Record<string, unknown> | undefined;
      return {
        source: 'OfferUp',
        externalUrl: (item.url ?? `https://offerup.com/item/detail/${item.id}`) as string,
        externalId: String(item.id ?? Math.random()),
        title: (item.title ?? '') as string,
        imageUrl: (item.picUrl ?? item.imageUrl ?? '') as string,
        price: safeParsePrice(item.price),
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

async function fetchGoogleShopping(query: string, filters: SearchFilters, apiKey: string): Promise<NormalizedListing[]> {
  const params = new URLSearchParams({
    engine: 'google_shopping', q: query, api_key: apiKey, num: '20', gl: 'us', hl: 'en',
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

    const normalizedQuery = normalizeText(query);

    // ── Cache check: if we fetched this query recently, serve from DB ─────────
    const { data: cachedGroup } = await supabase
      .from('comparable_groups')
      .select('id, canonical_product_name, median_price, low_price, high_price, normalized_attributes, fetched_at')
      .eq('canonical_product_name', normalizedQuery)
      .not('fetched_at', 'is', null)
      .gte('fetched_at', new Date(Date.now() - CACHE_TTL_MS).toISOString())
      .maybeSingle();

    if (cachedGroup) {
      console.log(`[cache] HIT for "${normalizedQuery}" (fetched ${cachedGroup.fetched_at})`);

      // Fetch listings + evaluations from DB via deal_evaluations join
      const { data: evalRows } = await supabase
        .from('deal_evaluations')
        .select('*, listing:listings(id, source, external_url, title, normalized_title, image_url, price, shipping_price, currency, condition, seller_name, seller_rating, location, description, category, created_at, posted_at)')
        .eq('comparable_group_id', cachedGroup.id);

      const rows = evalRows ?? [];

      // Apply filters client-side on cached results
      const filtered = rows.filter((r: Record<string, unknown>) => {
        const l = r.listing as Record<string, unknown>;
        if (!l) return false;
        const total = (parseFloat(String(l.price)) || 0) + (parseFloat(String(l.shipping_price)) || 0);
        if (filters.condition && l.condition !== filters.condition) return false;
        if (filters.source && l.source !== filters.source) return false;
        if (filters.maxPrice && total > Number(filters.maxPrice)) return false;
        if (filters.shippingIncluded && parseFloat(String(l.shipping_price)) !== 0) return false;
        return true;
      });

      const frontendListings = filtered.map((r: Record<string, unknown>) => {
        const l = r.listing as Record<string, unknown>;
        return {
          id: l.id,
          source: l.source,
          externalUrl: l.external_url,
          title: l.title,
          normalizedTitle: l.normalized_title,
          imageUrl: l.image_url ?? '',
          price: parseFloat(String(l.price)) || 0,
          shippingPrice: parseFloat(String(l.shipping_price)) || 0,
          totalPrice: (parseFloat(String(l.price)) || 0) + (parseFloat(String(l.shipping_price)) || 0),
          currency: 'USD',
          condition: l.condition,
          sellerName: l.seller_name ?? '',
          sellerRating: l.seller_rating ?? null,
          location: l.location ?? '',
          description: l.description ?? '',
          createdAt: l.created_at,
          postedAt: l.posted_at,
          category: l.category ?? '',
        };
      });

      const frontendEvals = filtered.map((r: Record<string, unknown>) => {
        const l = r.listing as Record<string, unknown>;
        return {
          id: r.id,
          listingId: r.listing_id,
          comparableGroupId: r.comparable_group_id,
          dealScore: r.deal_score,
          confidenceScore: r.confidence_score,
          estimatedSavings: parseFloat(String(r.estimated_savings)) || 0,
          flagReason: r.flag_reason ?? '',
          flagged: r.flagged,
        };
      });

      const attrs = cachedGroup.normalized_attributes as Record<string, unknown> ?? {};

      return new Response(
        JSON.stringify({
          success: true,
          listings: frontendListings,
          evaluations: frontendEvals,
          comparableGroups: [{
            id: cachedGroup.id,
            canonicalProductName: cachedGroup.canonical_product_name,
            medianPrice: cachedGroup.median_price,
            lowPrice: cachedGroup.low_price,
            highPrice: cachedGroup.high_price,
            soldMedianPrice: attrs.soldMedianPrice ?? null,
            soldCompsCount: attrs.soldCompsCount ?? 0,
          }],
          sourceErrors: {},
          meta: {
            totalResults: filtered.length,
            sources: {},
            soldComps: { eBay: 0, mercari: 0, total: attrs.soldCompsCount ?? 0 },
            scoringBaseline: (attrs.soldCompsCount as number ?? 0) >= 2 ? 'sold' : 'active',
            cached: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cache] MISS for "${normalizedQuery}" — fetching from APIs`);

    // ── Resolve API credentials ───────────────────────────────────────────────
    const ebayAppId = Deno.env.get('EBAY_APP_ID');
    const ebayCertId = Deno.env.get('EBAY_CERT_ID');
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    const serpApiKey = Deno.env.get('SERPAPI_KEY');

    // Fetch eBay token once (covers Browse + Marketplace Insights)
    let ebayToken: string | null = null;
    if (ebayAppId && ebayCertId) {
      ebayToken = await getEbayToken(ebayAppId, ebayCertId).catch(e => {
        console.error('[eBay token]', e.message); return null;
      });
    } else {
      console.warn('[eBay] EBAY_APP_ID or EBAY_CERT_ID not set — skipping eBay');
    }

    // ── Fetch ALL sources + sold comps in a single parallel batch ─────────────
    // Sold comps run alongside active listings — no sequential wait.
    const [eBayRes, mercariRes, fbRes, offerUpRes, googleRes, eBaySoldRes, mercariSoldRes] =
      await Promise.allSettled([
        ebayToken ? fetchEbay(query, filters, ebayToken) : Promise.resolve([]),
        apifyToken ? fetchMercari(query, filters, apifyToken) : Promise.resolve([]),
        apifyToken ? fetchFacebookMarketplace(query, filters, apifyToken) : Promise.resolve([]),
        apifyToken ? fetchOfferUp(query, filters, apifyToken) : Promise.resolve([]),
        serpApiKey ? fetchGoogleShopping(query, filters, serpApiKey) : Promise.resolve([]),
        // sold comps — parallel with the above, not sequential after
        ebayToken ? fetchEbaySoldComps(query, ebayToken) : Promise.resolve([]),
        apifyToken ? fetchMercariSoldComps(query, apifyToken) : Promise.resolve([]),
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
        console.log(`[${name}] ${result.value.length} active listings`);
        allListings.push(...result.value);
        sourceMeta[name] = result.value.length;
      } else {
        const msg = (result.reason as Error)?.message ?? 'Unknown error';
        console.error(`[${name}] Error: ${msg}`);
        sourceErrors[name] = msg;
        sourceMeta[name] = 0;
      }
    }

    const soldPrices: number[] = [
      ...(eBaySoldRes.status === 'fulfilled' ? eBaySoldRes.value : []),
      ...(mercariSoldRes.status === 'fulfilled' ? mercariSoldRes.value : []),
    ];

    const eBaySoldCount = eBaySoldRes.status === 'fulfilled' ? eBaySoldRes.value.length : 0;
    const mercariSoldCount = mercariSoldRes.status === 'fulfilled' ? mercariSoldRes.value.length : 0;
    console.log(`[Sold comps] eBay: ${eBaySoldCount} Mercari: ${mercariSoldCount} total: ${soldPrices.length}`);

    const filtered = applyFilters(allListings, filters);

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify({
          success: true, listings: [], evaluations: [], comparableGroups: [],
          sourceErrors, meta: { totalResults: 0, sources: sourceMeta },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Compute baseline metrics ──────────────────────────────────────────────
    const allTotalPrices = filtered.map(l => l.price + l.shippingPrice);
    const activeMed = median(allTotalPrices);
    const soldMed = soldPrices.length >= 2 ? median(soldPrices) : null;
    const scoreBaseline = soldMed ?? activeMed;
    const lowPrice = Math.min(...allTotalPrices);
    const highPrice = Math.max(...allTotalPrices);
    const now = new Date().toISOString();

    // ── Upsert comparable group (with fetched_at for cache invalidation) ──────
    const { data: groupData } = await supabase
      .from('comparable_groups')
      .upsert(
        {
          canonical_product_name: normalizedQuery,
          normalized_attributes: {
            originalQuery: query,
            soldMedianPrice: soldMed,
            soldCompsCount: soldPrices.length,
            activeCompsCount: filtered.length,
          },
          median_price: scoreBaseline,
          low_price: lowPrice,
          high_price: highPrice,
          fetched_at: now,
        },
        { onConflict: 'canonical_product_name' }
      )
      .select('id, canonical_product_name, median_price, low_price, high_price, normalized_attributes')
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
      posted_at: now,
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
      const scoring = computeDealScore(totalPrice, allTotalPrices, soldPrices);
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
          soldMedianPrice: (groupData.normalized_attributes as Record<string, unknown>)?.soldMedianPrice ?? null,
          soldCompsCount: (groupData.normalized_attributes as Record<string, unknown>)?.soldCompsCount ?? 0,
        }] : [],
        sourceErrors,
        meta: {
          totalResults: filtered.length,
          sources: sourceMeta,
          soldComps: { eBay: eBaySoldCount, mercari: mercariSoldCount, total: soldPrices.length },
          scoringBaseline: soldPrices.length >= 2 ? 'sold' : 'active',
          cached: false,
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
