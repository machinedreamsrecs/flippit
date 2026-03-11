import type { Listing, DealEvaluation, ComparableGroup } from './types';
import { computeDealScore } from '../lib/scoring';
import { normalizeTitle } from '../lib/normalize';

function listing(
  id: string,
  title: string,
  source: Listing['source'],
  price: number,
  shipping: number,
  condition: Listing['condition'],
  seller: string,
  rating: number | null,
  location: string,
  description: string,
  category: string,
  imageId: number
): Listing {
  return {
    id,
    source,
    externalUrl: `https://example.com/listing/${id}`,
    title,
    normalizedTitle: normalizeTitle(title),
    imageUrl: `https://picsum.photos/seed/${imageId}/400/300`,
    price,
    shippingPrice: shipping,
    totalPrice: price + shipping,
    currency: 'USD',
    condition,
    sellerName: seller,
    sellerRating: rating,
    location,
    description,
    createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    postedAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
    category,
  };
}

// ── Electronics ──────────────────────────────────────────────────────────────
export const ALL_LISTINGS: Listing[] = [
  listing('l001', 'Dyson V15 Detect Absolute Cordless Vacuum', 'eBay', 279, 0, 'Like New', 'cleantech_deals', 99.1, 'Austin, TX', 'Barely used Dyson V15 Detect Absolute. All attachments included. No scratches, works perfectly.', 'Electronics', 10),
  listing('l002', 'Dyson V15 Detect Absolute — Full Kit', 'Mercari', 310, 0, 'Good', 'mercari_seller22', 97.4, 'Seattle, WA', 'Dyson V15 in good condition. Minor surface wear. All original accessories included.', 'Electronics', 11),
  listing('l003', 'Dyson V15 Detect Vacuum Cleaner', 'eBay', 380, 0, 'New', 'vacuumking_ebay', 98.7, 'Chicago, IL', 'Brand new, sealed in box. Never opened.', 'Electronics', 12),
  listing('l004', 'Dyson V15 Detect Absolute Vacuum', 'OfferUp', 395, 0, 'New', 'appliance_outlet', null, 'Denver, CO', 'New in box Dyson V15.', 'Electronics', 13),
  listing('l005', 'Dyson V15 Detect Cordless Vacuum', 'Facebook Marketplace', 420, 0, 'New', 'fb_user_9421', null, 'Portland, OR', 'Sealed box, bought two by mistake.', 'Electronics', 14),
  listing('l006', 'Dyson V15 Detect Absolute', 'Mercari', 340, 0, 'Like New', 'sparkling_clean', 96.2, 'Boston, MA', 'Used twice. Mint condition.', 'Electronics', 15),

  listing('l007', 'Sony WH-1000XM5 Wireless Headphones', 'eBay', 199, 0, 'Like New', 'audiophile_bob', 98.3, 'New York, NY', 'Sony WH-1000XM5 in perfect condition. Comes with all original accessories and case.', 'Electronics', 20),
  listing('l008', 'Sony WH-1000XM5 Noise Canceling Headphones', 'Mercari', 245, 0, 'Good', 'techseller_m', 95.8, 'San Francisco, CA', 'Great condition, minor wear on ear cups.', 'Electronics', 21),
  listing('l009', 'Sony WH-1000XM5', 'eBay', 289, 0, 'New', 'sony_deals_outlet', 99.0, 'Miami, FL', 'Brand new sealed.', 'Electronics', 22),
  listing('l010', 'Sony WH-1000XM5 Wireless ANC Headphones', 'Amazon', 299, 0, 'New', 'Amazon.com', null, 'N/A', 'Official Amazon listing. Ships Prime.', 'Electronics', 23),

  listing('l011', 'Logitech MX Keys Advanced Wireless Keyboard', 'eBay', 59, 0, 'Like New', 'kb_reseller', 97.6, 'Atlanta, GA', 'Used for 2 months. Minimal wear. Mac layout.', 'Electronics', 30),
  listing('l012', 'Logitech MX Keys Wireless Keyboard', 'Mercari', 72, 0, 'Good', 'office_stuff_22', 94.1, 'Dallas, TX', 'Good condition, all keys work perfectly.', 'Electronics', 31),
  listing('l013', 'Logitech MX Keys Advanced Keyboard', 'Amazon', 99, 0, 'New', 'Amazon.com', null, 'N/A', 'New retail listing.', 'Electronics', 32),
  listing('l014', 'Logitech MX Keys Full Size Keyboard', 'OfferUp', 85, 0, 'Like New', 'gadget_flip', null, 'Phoenix, AZ', 'Like new, barely used.', 'Electronics', 33),

  listing('l015', 'MacBook Air M2 13" 8GB 256GB Space Gray', 'eBay', 749, 0, 'Good', 'mac_marketplace', 98.1, 'Los Angeles, CA', 'MacBook Air M2 in good condition. Some light scratches on lid. Battery cycle count 112.', 'Electronics', 40),
  listing('l016', 'Apple MacBook Air M2 13-inch 8GB 256GB', 'Mercari', 849, 0, 'Like New', 'tech_resell_pro', 96.9, 'Chicago, IL', 'Excellent condition. No scratches. Includes charger.', 'Electronics', 41),
  listing('l017', 'MacBook Air M2 2022 256GB', 'Facebook Marketplace', 920, 0, 'Good', 'fb_tech_seller', null, 'Houston, TX', 'MacBook Air M2. Some wear but works great.', 'Electronics', 42),
  listing('l018', 'Apple MacBook Air M2 Refurbished', 'eBay', 990, 0, 'New', 'certified_refurb', 99.3, 'San Jose, CA', 'Apple certified refurbished.', 'Electronics', 43),

  // ── Collectibles ────────────────────────────────────────────────────────────
  listing('l019', 'PSA 10 Charizard Base Set Holo Pokemon Card', 'eBay', 3200, 0, 'New', 'pokecollect_prime', 99.7, 'Online', 'PSA 10 graded 1999 Base Set Charizard Holo. Case is pristine.', 'Collectibles', 50),
  listing('l020', 'PSA 10 Charizard 1999 Base Set', 'eBay', 3800, 0, 'New', 'card_vault_elite', 99.2, 'Online', 'Iconic card in PSA 10 gem mint.', 'Collectibles', 51),
  listing('l021', 'Base Set Charizard PSA 10 Holo', 'eBay', 4100, 0, 'New', 'graded_collectibles', 98.8, 'Online', 'Perfect graded Charizard, gem mint.', 'Collectibles', 52),
  listing('l022', 'Charizard Base Set PSA 10 Pokemon', 'eBay', 4400, 0, 'New', 'legacy_cards', 99.5, 'Online', 'Graded gem mint by PSA.', 'Collectibles', 53),
  listing('l023', '1999 Pokemon Base Charizard PSA 10', 'Mercari', 3600, 0, 'New', 'rare_cards_mercari', 97.0, 'Online', 'PSA 10 Charizard Base Set. Real deal.', 'Collectibles', 54),

  // ── Furniture ───────────────────────────────────────────────────────────────
  listing('l024', 'Herman Miller Aeron Chair Size B Graphite', 'eBay', 599, 0, 'Good', 'office_depot_resell', 97.4, 'New York, NY', 'Herman Miller Aeron Size B, Graphite. Works perfectly. Some light wear on armrests.', 'Furniture', 60),
  listing('l025', 'Herman Miller Aeron Size B — Fully Loaded', 'Craigslist', 750, 0, 'Good', 'nyc_office_close', null, 'Brooklyn, NY', 'Office closure sale. Aeron B, all adjustments work.', 'Furniture', 61),
  listing('l026', 'Herman Miller Aeron Chair B Graphite', 'eBay', 820, 0, 'Like New', 'ergonomic_deals', 96.6, 'Boston, MA', 'Like new Aeron B. Barely used from home office.', 'Furniture', 62),
  listing('l027', 'Herman Miller Aeron B Refurbished', 'OfferUp', 875, 0, 'Good', 'refurb_office', null, 'Washington, DC', 'Professionally refurbished Aeron B.', 'Furniture', 63),
  listing('l028', 'Herman Miller Aeron Chair Size B', 'Facebook Marketplace', 950, 0, 'Like New', 'fb_dc_office', null, 'Arlington, VA', 'Barely used. Moving sale.', 'Furniture', 64),

  // ── Apparel ─────────────────────────────────────────────────────────────────
  listing('l029', 'Nike Vomero 5 Cobalt Bliss Size 10', 'eBay', 89, 12, 'New', 'sneaker_connect', 96.8, 'Miami, FL', 'Nike Vomero 5 deadstock. Size 10. Cobalt Bliss colorway.', 'Apparel', 70),
  listing('l030', 'Nike Vomero 5 Size 10 Cobalt Bliss DS', 'StockX', 130, 14, 'New', 'StockX', null, 'Online', 'Deadstock verified. Cobalt Bliss.', 'Apparel', 71),
  listing('l031', 'Nike Vomero 5 Cobalt Bliss 10', 'Mercari', 125, 8, 'New', 'kicks_resell', 95.3, 'Chicago, IL', 'Brand new in box. Never worn.', 'Apparel', 72),
  listing('l032', 'Vomero 5 Nike Size 10 New', 'Depop', 140, 10, 'New', 'depop_kicks22', 91.0, 'Los Angeles, CA', 'New in box. Cobalt Bliss.', 'Apparel', 73),

  listing('l033', "Arc'teryx Beta LT Jacket Men's Medium Black", 'eBay', 310, 0, 'Like New', 'outdoor_reseller', 98.2, 'Denver, CO', "Arc'teryx Beta LT in black, men's medium. Worn 3 times. Gore-Tex intact.", 'Apparel', 80),
  listing('l034', "Arc'teryx Beta LT Jacket Black Medium", 'Poshmark', 389, 0, 'Good', 'posh_outdoor', 94.7, 'Salt Lake City, UT', 'Great condition, minor pilling on cuffs.', 'Apparel', 81),
  listing('l035', "Arc'teryx Beta LT Men's Medium", 'eBay', 420, 0, 'Like New', 'premium_gear_sell', 97.1, 'Seattle, WA', 'Excellent condition. All zips work.', 'Apparel', 82),
  listing('l036', "Arc'teryx Beta LT Black Medium Jacket", 'Facebook Marketplace', 450, 0, 'Good', 'fb_outdoor_pdx', null, 'Portland, OR', 'Lightly used, moving to warmer climate.', 'Apparel', 83),

  // ── Auto ────────────────────────────────────────────────────────────────────
  listing('l037', 'Michelin Pilot Sport 4S 245/40ZR18 97Y Set of 4', 'eBay', 680, 35, 'New', 'tire_depot_online', 98.5, 'Online', 'Set of 4 Michelin Pilot Sport 4S 245/40ZR18 97Y. Brand new, never mounted.', 'Auto', 90),
  listing('l038', 'Michelin Pilot Sport 4S 245/40ZR18 Set 4', 'eBay', 820, 0, 'New', 'tires_direct_usa', 97.9, 'Online', 'New set of 4, factory fresh.', 'Auto', 91),
  listing('l039', 'Michelin Pilot Sport 4S 245 40 18 x4', 'Craigslist', 760, 0, 'New', 'craigslist_auto', null, 'San Diego, CA', 'New set of 4 Michelin PS4S. Great deal.', 'Auto', 92),
  listing('l040', 'Michelin PS4S 245/40ZR18 Set of Four', 'Facebook Marketplace', 900, 0, 'New', 'fb_tire_seller', null, 'Orange County, CA', 'New tires, got a truck instead.', 'Auto', 93),

  // ── Tools ───────────────────────────────────────────────────────────────────
  listing('l041', 'DeWalt 20V MAX Drill/Driver Kit DCK240C2', 'eBay', 89, 0, 'Like New', 'tool_reseller_tx', 97.3, 'Houston, TX', 'DeWalt 20V MAX combo kit. Drill + impact driver. Used twice. Both batteries included.', 'Tools', 100),
  listing('l042', 'DeWalt DCK240C2 Drill and Impact Driver Combo', 'OfferUp', 119, 0, 'Good', 'offerup_tools', null, 'Dallas, TX', 'Good condition, all pieces included.', 'Tools', 101),
  listing('l043', 'DeWalt 20V Drill Driver Kit', 'Facebook Marketplace', 135, 0, 'Like New', 'fb_contractor_tools', null, 'Fort Worth, TX', 'Like new. Upgrading to brushless.', 'Tools', 102),
  listing('l044', 'DeWalt 20V MAX 2-Tool Combo Kit', 'Amazon', 149, 0, 'New', 'Amazon.com', null, 'N/A', 'New retail. Ships Prime.', 'Tools', 103),
];

// ── Comparable Groups ─────────────────────────────────────────────────────────
export const COMPARABLE_GROUPS: ComparableGroup[] = [
  {
    id: 'cg_dyson_v15',
    canonicalProductName: 'Dyson V15 Detect Absolute',
    normalizedAttributes: { type: 'cordless vacuum', brand: 'dyson', model: 'v15 detect' },
    comparableListingIds: ['l001', 'l002', 'l003', 'l004', 'l005', 'l006'],
    medianPrice: 360,
    lowPrice: 279,
    highPrice: 420,
  },
  {
    id: 'cg_sony_xm5',
    canonicalProductName: 'Sony WH-1000XM5',
    normalizedAttributes: { type: 'wireless headphones', brand: 'sony', model: 'wh-1000xm5' },
    comparableListingIds: ['l007', 'l008', 'l009', 'l010'],
    medianPrice: 267,
    lowPrice: 199,
    highPrice: 299,
  },
  {
    id: 'cg_mx_keys',
    canonicalProductName: 'Logitech MX Keys Advanced',
    normalizedAttributes: { type: 'wireless keyboard', brand: 'logitech', model: 'mx keys' },
    comparableListingIds: ['l011', 'l012', 'l013', 'l014'],
    medianPrice: 85,
    lowPrice: 59,
    highPrice: 99,
  },
  {
    id: 'cg_macbook_m2',
    canonicalProductName: 'MacBook Air M2 13-inch 8GB 256GB',
    normalizedAttributes: { type: 'laptop', brand: 'apple', model: 'macbook air m2' },
    comparableListingIds: ['l015', 'l016', 'l017', 'l018'],
    medianPrice: 885,
    lowPrice: 749,
    highPrice: 990,
  },
  {
    id: 'cg_charizard',
    canonicalProductName: 'PSA 10 Base Set Charizard',
    normalizedAttributes: { type: 'pokemon card', grade: 'psa 10', set: 'base set' },
    comparableListingIds: ['l019', 'l020', 'l021', 'l022', 'l023'],
    medianPrice: 3800,
    lowPrice: 3200,
    highPrice: 4400,
  },
  {
    id: 'cg_aeron_b',
    canonicalProductName: 'Herman Miller Aeron Chair Size B',
    normalizedAttributes: { type: 'office chair', brand: 'herman miller', model: 'aeron', size: 'b' },
    comparableListingIds: ['l024', 'l025', 'l026', 'l027', 'l028'],
    medianPrice: 820,
    lowPrice: 599,
    highPrice: 950,
  },
  {
    id: 'cg_vomero5',
    canonicalProductName: 'Nike Vomero 5 Cobalt Bliss Size 10',
    normalizedAttributes: { type: 'sneaker', brand: 'nike', model: 'vomero 5', size: '10' },
    comparableListingIds: ['l029', 'l030', 'l031', 'l032'],
    medianPrice: 133,
    lowPrice: 101,
    highPrice: 150,
  },
  {
    id: 'cg_arcteryx',
    canonicalProductName: "Arc'teryx Beta LT Jacket Men's Medium",
    normalizedAttributes: { type: 'jacket', brand: "arc'teryx", model: 'beta lt', size: 'medium' },
    comparableListingIds: ['l033', 'l034', 'l035', 'l036'],
    medianPrice: 405,
    lowPrice: 310,
    highPrice: 450,
  },
  {
    id: 'cg_ps4s',
    canonicalProductName: 'Michelin Pilot Sport 4S 245/40ZR18 Set of 4',
    normalizedAttributes: { type: 'tire', brand: 'michelin', model: 'pilot sport 4s', size: '245/40zr18' },
    comparableListingIds: ['l037', 'l038', 'l039', 'l040'],
    medianPrice: 830,
    lowPrice: 715,
    highPrice: 900,
  },
  {
    id: 'cg_dewalt_combo',
    canonicalProductName: 'DeWalt 20V MAX DCK240C2 Drill Combo Kit',
    normalizedAttributes: { type: 'power tool', brand: 'dewalt', model: 'dck240c2' },
    comparableListingIds: ['l041', 'l042', 'l043', 'l044'],
    medianPrice: 127,
    lowPrice: 89,
    highPrice: 149,
  },
];

// ── Precompute all evaluations ────────────────────────────────────────────────
function buildEvaluations(): Map<string, DealEvaluation> {
  const map = new Map<string, DealEvaluation>();
  const listingMap = new Map(ALL_LISTINGS.map(l => [l.id, l]));

  for (const group of COMPARABLE_GROUPS) {
    const comparables = group.comparableListingIds
      .map(id => listingMap.get(id))
      .filter(Boolean) as Listing[];

    for (const listing of comparables) {
      const otherComparables = comparables.filter(c => c.id !== listing.id);
      if (otherComparables.length > 0) {
        const evaluation = computeDealScore(listing, otherComparables, group.id);
        map.set(listing.id, evaluation);
      }
    }
  }
  return map;
}

export const DEAL_EVALUATIONS: Map<string, DealEvaluation> = buildEvaluations();

export function getEvaluation(listingId: string): DealEvaluation | undefined {
  return DEAL_EVALUATIONS.get(listingId);
}

export function getComparableGroup(listingId: string): ComparableGroup | undefined {
  return COMPARABLE_GROUPS.find(g => g.comparableListingIds.includes(listingId));
}

export function getComparableListings(listingId: string): Listing[] {
  const group = getComparableGroup(listingId);
  if (!group) return [];
  const listingMap = new Map(ALL_LISTINGS.map(l => [l.id, l]));
  return group.comparableListingIds
    .filter(id => id !== listingId)
    .map(id => listingMap.get(id))
    .filter(Boolean) as Listing[];
}

export function getFlaggedListings(): Listing[] {
  return ALL_LISTINGS.filter(l => {
    const ev = DEAL_EVALUATIONS.get(l.id);
    return ev?.flagged;
  });
}
