export type Plan = 'free' | 'pro';
export type DealScore = 'Strong' | 'Good' | 'Possible' | 'None';
export type ConfidenceScore = 'High' | 'Medium' | 'Low';
export type Condition = 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
export type ListingSource =
  | 'eBay'
  | 'Facebook Marketplace'
  | 'Craigslist'
  | 'Mercari'
  | 'OfferUp'
  | 'Poshmark'
  | 'Amazon'
  | 'Depop'
  | 'StockX';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: string;
}

export interface SearchFilters {
  condition?: Condition | '';
  source?: ListingSource | '';
  maxPrice?: number | '';
  shippingIncluded?: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  query: string;
  normalizedQuery: string;
  filters: SearchFilters;
  createdAt: string;
  alertsEnabled: boolean;
}

export interface SavedProduct {
  id: string;
  userId: string;
  listingId: string;
  listing: Listing;
  savedAt: string;
}

export interface Listing {
  id: string;
  source: ListingSource;
  externalUrl: string;
  title: string;
  normalizedTitle: string;
  imageUrl: string;
  price: number;
  shippingPrice: number;
  totalPrice: number;
  currency: 'USD';
  condition: Condition;
  sellerName: string;
  sellerRating: number | null;
  location: string;
  description: string;
  createdAt: string;
  postedAt: string;
  category: string;
}

export interface ComparableGroup {
  id: string;
  canonicalProductName: string;
  normalizedAttributes: Record<string, string>;
  comparableListingIds: string[];
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
}

export type FlippitListingType = 'buy_now' | 'auction';
export type FlippitListingStatus = 'active' | 'sold' | 'ended';

export interface FlippitListing {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  condition: Condition;
  category: string;
  images: string[];
  location: string;
  listingType: FlippitListingType;
  price?: number;
  startingBid?: number;
  reservePrice?: number;
  currentBid?: number;
  bidCount: number;
  endsAt?: string;
  status: FlippitListingStatus;
  buyerId?: string;
  salePrice?: number;
  platformFee?: number;
  sellerPayout?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlippitBid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

export interface DealEvaluation {
  id: string;
  listingId: string;
  comparableGroupId: string;
  dealScore: DealScore;
  confidenceScore: ConfidenceScore;
  estimatedSavings: number;
  flagReason: string;
  flagged: boolean;
}
