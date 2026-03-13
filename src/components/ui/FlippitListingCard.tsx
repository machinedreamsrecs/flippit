import { Link } from 'react-router-dom';
import { MapPin, Clock, Gavel, Tag } from 'lucide-react';
import type { FlippitListing } from '../../data/types';
import { formatPrice } from '../../lib/utils';

interface Props {
  listing: FlippitListing;
}

function timeUntil(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d left`;
}

const CONDITION_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700',
  'Like New': 'bg-emerald-50 text-emerald-700',
  'Good': 'bg-gray-100 text-gray-600',
  'Fair': 'bg-amber-50 text-amber-700',
  'Poor': 'bg-red-50 text-red-700',
};

export default function FlippitListingCard({ listing }: Props) {
  const thumb = listing.images[0];
  const isBuyNow = listing.listingType === 'buy_now';
  const displayPrice = isBuyNow
    ? listing.price
    : (listing.currentBid ?? listing.startingBid);

  return (
    <Link
      to={`/flip/${listing.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden hover:shadow-md hover:border-indigo-100 transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Tag className="w-10 h-10" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          {isBuyNow ? (
            <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              <Tag className="w-3 h-3" /> Buy Now
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              <Gavel className="w-3 h-3" /> Auction
            </span>
          )}
        </div>

        {/* Auction timer */}
        {!isBuyNow && listing.endsAt && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm">
              <Clock className="w-3 h-3" /> {timeUntil(listing.endsAt)}
            </span>
          </div>
        )}

        {/* Sold overlay */}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 font-bold text-sm px-3 py-1.5 rounded-full">Flipped ✓</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1.5 group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </p>

        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${CONDITION_COLORS[listing.condition] ?? 'bg-gray-100 text-gray-600'}`}>
            {listing.condition}
          </span>
          <span className="text-xs text-gray-400">{listing.category}</span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">
              {isBuyNow ? 'Price' : (listing.bidCount > 0 ? `Current bid · ${listing.bidCount} bid${listing.bidCount === 1 ? '' : 's'}` : 'Starting bid')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {displayPrice != null ? formatPrice(displayPrice) : '—'}
            </p>
          </div>

          {listing.location && (
            <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{listing.location}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-1.5 truncate">by {listing.sellerName}</p>
      </div>
    </Link>
  );
}
