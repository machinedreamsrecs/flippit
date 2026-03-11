import { Bookmark, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import SavedSearchCard from '../components/ui/SavedSearchCard';
import EmptyState from '../components/ui/EmptyState';
import UpgradePrompt from '../components/ui/UpgradePrompt';

const MAX_FREE = 3;

export default function SavedSearchesPage() {
  const { user } = useAuth();
  const { savedSearches, canSaveMore, removeSearch, toggleAlert } = useUser();
  const isPro = user?.plan === 'pro';
  const atLimit = !canSaveMore;

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isPro
                ? `${savedSearches.length} saved`
                : `${savedSearches.length} of ${MAX_FREE} saved`}
              {!isPro && (
                <span className="ml-2">
                  <Link to="/account" className="text-indigo-600 hover:underline text-xs font-medium">Upgrade for unlimited</Link>
                </span>
              )}
            </p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New search
          </Link>
        </div>

        {/* Upgrade prompt at limit */}
        {atLimit && !isPro && (
          <div className="mb-6">
            <UpgradePrompt message={`You've used all ${MAX_FREE} saved searches on the free plan.`} />
          </div>
        )}

        {/* Alert info for free users */}
        {!isPro && savedSearches.some(s => s.alertsEnabled === false) && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6">
            Alerts are a Pro feature. <Link to="/account" className="font-medium hover:underline">Upgrade to get notified in real-time.</Link>
          </div>
        )}

        {/* Empty state */}
        {savedSearches.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title="No saved searches yet"
            description="Search for a product and save it to track deals over time."
            action={
              <Link
                to="/search"
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Start searching
              </Link>
            }
          />
        )}

        {/* Saved search cards */}
        <div className="space-y-4">
          {savedSearches.map(s => (
            <SavedSearchCard
              key={s.id}
              savedSearch={s}
              onRemove={() => removeSearch(s.id)}
              onToggleAlert={() => toggleAlert(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
