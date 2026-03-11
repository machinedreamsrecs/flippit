import { Link } from 'react-router-dom';
import { Bell, BellOff, Trash2, Search, ChevronRight, Lock } from 'lucide-react';
import type { SavedSearch } from '../../data/types';
import { formatDate, formatPrice } from '../../lib/utils';
import { ALL_LISTINGS, getEvaluation } from '../../data/mockListings';
import { searchListings } from '../../lib/normalize';
import { useAuth } from '../../contexts/AuthContext';
import DealScoreBadge from './DealScoreBadge';

interface Props {
  savedSearch: SavedSearch;
  onRemove: () => void;
  onToggleAlert: () => void;
}

export default function SavedSearchCard({ savedSearch, onRemove, onToggleAlert }: Props) {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';

  // Find top flagged listings for this search
  const matched = searchListings(ALL_LISTINGS, savedSearch.query, 0.3);
  const flagged = matched
    .filter(l => getEvaluation(l.id)?.flagged)
    .slice(0, 3);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Search className="w-4 h-4 text-gray-500" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/search?q=${encodeURIComponent(savedSearch.query)}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-1 group"
            >
              {savedSearch.query}
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
            </Link>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {savedSearch.filters.condition && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{savedSearch.filters.condition}</span>
              )}
              {savedSearch.filters.maxPrice && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Max {formatPrice(savedSearch.filters.maxPrice as number)}
                </span>
              )}
              {savedSearch.filters.shippingIncluded && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Free shipping</span>
              )}
              <span className="text-xs text-gray-400">Saved {formatDate(savedSearch.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Alert toggle */}
          <div className="relative group/alert">
            <button
              onClick={isPro ? onToggleAlert : undefined}
              className={`p-2 rounded-lg transition-colors ${
                isPro
                  ? savedSearch.alertsEnabled
                    ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              {savedSearch.alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            {!isPro && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover/alert:opacity-100 transition-opacity pointer-events-none z-10">
                <Lock className="w-3 h-3 inline mr-1" />
                Alerts require Pro
              </div>
            )}
          </div>

          <button
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Latest flagged deals */}
      {flagged.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Latest deals</p>
          <div className="space-y-2">
            {flagged.map(l => {
              const ev = getEvaluation(l.id);
              return (
                <Link
                  key={l.id}
                  to={`/listing/${l.id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                >
                  <img src={l.imageUrl} alt={l.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{l.title}</p>
                    <p className="text-xs text-gray-500">{formatPrice(l.totalPrice)} total</p>
                  </div>
                  {ev && <DealScoreBadge score={ev.dealScore} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
