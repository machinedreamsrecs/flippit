import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Plus, Loader2, CheckCircle, Clock, Gavel } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { FlippitListing } from '../data/types';
import { dbRowToFlippitListing, calcSellerPayout } from '../lib/flippit-fee';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/ui/EmptyState';

function timeUntil(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

const TABS = ['Active', 'Sold', 'Ended'];

export default function MyFlipsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<FlippitListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('Active');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('flippit_listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setListings(data ? data.map(dbRowToFlippitListing) as FlippitListing[] : []);
        setIsLoading(false);
      });
  }, [user]);

  const filtered = listings.filter(l =>
    tab === 'Active' ? l.status === 'active' :
    tab === 'Sold' ? l.status === 'sold' :
    l.status === 'ended',
  );

  const totalEarned = listings
    .filter(l => l.status === 'sold')
    .reduce((sum, l) => sum + (l.sellerPayout ?? 0), 0);

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Flips</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
              {totalEarned > 0 && (
                <span className="ml-2 text-emerald-600 font-medium">{formatPrice(totalEarned)} earned</span>
              )}
            </p>
          </div>
          <Link
            to="/sell/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New listing
          </Link>
        </div>

        {/* Stats */}
        {listings.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{listings.filter(l => l.status === 'active').length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{listings.filter(l => l.status === 'sold').length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Flipped</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarned)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total earned</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} <span className="text-xs text-gray-400 ml-1">
                {listings.filter(l =>
                  t === 'Active' ? l.status === 'active' :
                  t === 'Sold' ? l.status === 'sold' :
                  l.status === 'ended',
                ).length}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={tab === 'Active' ? "You don't have any active listings" : `No ${tab.toLowerCase()} listings yet`}
            description={tab === 'Active' ? "List something and let the market come to you." : ''}
            action={tab === 'Active' ? (
              <Link
                to="/sell/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> List something
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(l => {
              const isBuyNow = l.listingType === 'buy_now';
              const displayPrice = isBuyNow ? l.price : (l.currentBid ?? l.startingBid);

              return (
                <Link
                  key={l.id}
                  to={`/flip/${l.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-card hover:border-indigo-100 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4 p-4">
                    {/* Thumb */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {l.images[0] ? (
                        <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Tag className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">{l.title}</p>
                      <div className="flex items-center gap-2 mb-2">
                        {isBuyNow ? (
                          <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-1.5 py-0.5 rounded">Buy Now</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-600 font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Gavel className="w-2.5 h-2.5" /> Auction
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{l.condition}</span>
                        {!isBuyNow && l.endsAt && l.status === 'active' && (
                          <span className="text-xs text-amber-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {timeUntil(l.endsAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {displayPrice != null ? formatPrice(displayPrice) : '—'}
                        {!isBuyNow && l.bidCount > 0 && (
                          <span className="text-xs font-normal text-gray-400 ml-1">{l.bidCount} bid{l.bidCount !== 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 flex flex-col items-end justify-between">
                      {l.status === 'sold' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCircle className="w-3 h-3" /> Flipped!
                        </span>
                      ) : l.status === 'ended' ? (
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Ended</span>
                      ) : (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Live</span>
                      )}
                      {l.status === 'sold' && l.sellerPayout != null && (
                        <p className="text-sm font-semibold text-emerald-600 mt-auto">
                          {formatPrice(calcSellerPayout(l.salePrice!))} earned
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
