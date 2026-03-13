import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Loader2, Plus, Gavel } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { FlippitListing } from '../data/types';
import { dbRowToFlippitListing } from '../lib/flippit-fee';
import FlippitListingCard from '../components/ui/FlippitListingCard';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['All', 'Electronics', 'Sneakers', 'Streetwear', 'Jewelry', 'Watches', 'Collectibles', 'Sports Cards', 'Other'];
const LISTING_TYPES = [
  { value: '', label: 'All' },
  { value: 'buy_now', label: 'Buy Now' },
  { value: 'auction', label: 'Auction' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'ending_soon', label: 'Ending soon' },
];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<FlippitListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [listingType, setListingType] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    setIsLoading(true);
    let q = supabase
      .from('flippit_listings')
      .select('*')
      .eq('status', 'active');

    if (category !== 'All') q = q.eq('category', category);
    if (listingType) q = q.eq('listing_type', listingType);

    if (sort === 'newest') q = q.order('created_at', { ascending: false });
    else if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: false });
    else if (sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
    else if (sort === 'ending_soon') q = q.order('ends_at', { ascending: true, nullsFirst: false });

    q.limit(60).then(({ data }) => {
      setListings(data ? data.map(dbRowToFlippitListing) as FlippitListing[] : []);
      setIsLoading(false);
    });
  }, [category, listingType, sort]);

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Flippit Market
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Buy and sell directly with other flippers.</p>
            </div>
            {user ? (
              <Link
                to="/sell/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Sell something
              </Link>
            ) : (
              <Link
                to="/login?returnTo=/sell/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Sell something
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === c
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            {/* Listing type */}
            <select
              value={listingType}
              onChange={e => setListingType(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LISTING_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Nothing here yet"
            description="Be the first to list something on the Flippit Market."
            action={
              <Link
                to={user ? '/sell/new' : '/login?returnTo=/sell/new'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> List something
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">{listings.length} listing{listings.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {listings.map(l => (
                <FlippitListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        )}

        {/* Sell CTA banner */}
        {!isLoading && (
          <div className="mt-12 bg-indigo-600 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white font-semibold text-lg">Have something to sell?</p>
              <p className="text-indigo-200 text-sm mt-0.5">List it in minutes. 12% fee, drops to 7% over $10k.</p>
            </div>
            <Link
              to={user ? '/sell/new' : '/login?returnTo=/sell/new'}
              className="px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-sm flex-shrink-0 flex items-center gap-2"
            >
              <Gavel className="w-4 h-4" /> Start flipping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
