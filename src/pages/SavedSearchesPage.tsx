import { Bookmark, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import ListingCard from '../components/ui/ListingCard';
import EmptyState from '../components/ui/EmptyState';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import type { Listing } from '../data/types';

const MAX_FREE = 3;

export default function SavedSearchesPage() {
  const { user } = useAuth();
  const { savedProducts, canSaveMore, removeProduct } = useUser();
  const isPro = user?.plan === 'pro';

  async function handleUnsave(id: string) {
    try {
      await removeProduct(id);
      toast('Removed from saved products.');
    } catch {
      toast.error('Failed to remove product.');
    }
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isPro
                ? `${savedProducts.length} saved`
                : `${savedProducts.length} of ${MAX_FREE} saved`}
              {!isPro && (
                <span className="ml-2">
                  <Link to="/account" className="text-indigo-600 hover:underline text-xs font-medium">
                    Upgrade for unlimited
                  </Link>
                </span>
              )}
            </p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Browse listings
          </Link>
        </div>

        {/* Upgrade prompt at limit */}
        {!canSaveMore && !isPro && (
          <div className="mb-6">
            <UpgradePrompt message={`You've used all ${MAX_FREE} saved products on the free plan.`} />
          </div>
        )}

        {/* Empty state */}
        {savedProducts.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title="No saved products yet"
            description="Browse listings and hit the bookmark icon to save products you're watching."
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

        {/* Product grid */}
        {savedProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedProducts.map(sp => (
              <ListingCard
                key={sp.id}
                listing={sp.listing as Listing}
                isSaved={true}
                onSave={() => handleUnsave(sp.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
