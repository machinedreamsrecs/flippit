import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import type { Listing } from '../../data/types';
import { getEvaluation } from '../../data/mockListings';
import { formatPrice, timeAgo, cn } from '../../lib/utils';
import DealScoreBadge from './DealScoreBadge';

interface Props {
  listing: Listing;
  compact?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
}

export default function ListingCard({ listing, compact = false, isSaved = false, onSave }: Props) {
  const evaluation = getEvaluation(listing.id);
  const isFlagged = evaluation?.flagged;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border transition-all group',
        isFlagged
          ? 'border-l-4 border-l-emerald-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 shadow-card hover:shadow-card-hover'
          : 'border-gray-100 shadow-card hover:shadow-card-hover'
      )}
    >
      <Link to={`/listing/${listing.id}`} className="block">
        {/* Image */}
        <div className={cn('relative overflow-hidden rounded-t-lg', compact ? 'h-36' : 'h-44')}>
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {isFlagged && evaluation && (
            <div className="absolute top-2 left-2">
              <DealScoreBadge score={evaluation.dealScore} />
            </div>
          )}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
            {listing.source}
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          <h3 className={cn('font-medium text-gray-900 line-clamp-2 leading-snug', compact ? 'text-xs' : 'text-sm')}>
            {listing.title}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            <span className={cn('font-semibold text-gray-900', compact ? 'text-sm' : 'text-base')}>
              {formatPrice(listing.price)}
            </span>
            {listing.shippingPrice === 0 ? (
              <span className="text-xs text-emerald-600 font-medium">Free shipping</span>
            ) : (
              <span className="text-xs text-gray-400">+{formatPrice(listing.shippingPrice)} ship</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', {
              'bg-blue-50 text-blue-700': listing.condition === 'New',
              'bg-emerald-50 text-emerald-700': listing.condition === 'Like New',
              'bg-gray-100 text-gray-600': listing.condition === 'Good',
              'bg-amber-50 text-amber-700': listing.condition === 'Fair',
              'bg-red-50 text-red-700': listing.condition === 'Poor',
            })}>
              {listing.condition}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(listing.postedAt)}</span>
          </div>

          {!compact && isFlagged && evaluation?.flagReason && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
              {evaluation.flagReason}
            </p>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="px-3 pb-3 flex items-center gap-2">
        {onSave && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onSave(); }}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
              isSaved
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            {isSaved ? 'Saved' : 'Save'}
          </button>
        )}
        <a
          href={listing.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          View <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
