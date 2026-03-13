/** Platform fee rates */
export const FEE_RATE_STANDARD = 0.12; // 12% on sales < $10,000
export const FEE_RATE_HIGH_VALUE = 0.07; // 7% on sales >= $10,000
export const HIGH_VALUE_THRESHOLD = 10_000;

export function getFeeRate(price: number): number {
  return price >= HIGH_VALUE_THRESHOLD ? FEE_RATE_HIGH_VALUE : FEE_RATE_STANDARD;
}

export function calcFee(price: number): number {
  return Math.round(price * getFeeRate(price) * 100) / 100;
}

export function calcSellerPayout(price: number): number {
  return Math.round((price - calcFee(price)) * 100) / 100;
}

export function feeLabel(price: number): string {
  const rate = getFeeRate(price);
  return `${(rate * 100).toFixed(0)}% platform fee`;
}

// DB row → FlippitListing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToFlippitListing(row: Record<string, any>) {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    title: row.title as string,
    description: row.description as string,
    condition: row.condition as string,
    category: row.category as string,
    images: (row.images ?? []) as string[],
    location: row.location as string,
    listingType: row.listing_type as string,
    price: row.price != null ? Number(row.price) : undefined,
    startingBid: row.starting_bid != null ? Number(row.starting_bid) : undefined,
    reservePrice: row.reserve_price != null ? Number(row.reserve_price) : undefined,
    currentBid: row.current_bid != null ? Number(row.current_bid) : undefined,
    bidCount: Number(row.bid_count ?? 0),
    endsAt: row.ends_at as string | undefined,
    status: row.status as string,
    buyerId: row.buyer_id as string | undefined,
    salePrice: row.sale_price != null ? Number(row.sale_price) : undefined,
    platformFee: row.platform_fee != null ? Number(row.platform_fee) : undefined,
    sellerPayout: row.seller_payout != null ? Number(row.seller_payout) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
