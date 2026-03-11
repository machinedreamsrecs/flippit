import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Bookmark, BookmarkCheck, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_LISTINGS, getEvaluation } from '../data/mockListings';
import type { Listing, DealEvaluation, SearchFilters } from '../data/types';
import { searchListings } from '../lib/normalize';
import SearchBar from '../components/ui/SearchBar';
import FilterBar from '../components/ui/FilterBar';
import ListingCard from '../components/ui/ListingCard';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import UpgradePrompt from '../components/ui/UpgradePrompt';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../integrations/supabase/client';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') ?? '';
  const { user } = useAuth();
  const { savedSearches, canSaveMore, saveSearch, isSearchSaved } = useUser();

  const [filters, setFilters] = useState<SearchFilters>({});
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Live results from the search-listings Edge Function
  const [liveListings, setLiveListings] = useState<Listing[] | null>(null);
  const [liveEvals, setLiveEvals] = useState<Map<string, DealEvaluation> | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);

  useEffect(() => { setShowUpgradePrompt(false); }, [query]);

  // Call the edge function whenever the query changes
  useEffect(() => {
    if (!query.trim()) {
      setLiveListings(null);
      setLiveEvals(null);
      setIsLiveData(false);
      return;
    }

    let cancelled = false;
    setIsLiveLoading(true);
    setIsLiveData(false);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('search-listings', {
          body: { query, filters },
        });

        if (cancelled) return;

        if (error || !data?.success) {
          console.warn('[SearchPage] Edge function unavailable, using mock data:', error?.message ?? data?.error);
          setLiveListings(null);
          setLiveEvals(null);
          setIsLiveData(false);
          return;
        }

        const listings = (data.listings ?? []) as Listing[];
        const evalsMap = new Map<string, DealEvaluation>();
        (data.evaluations ?? []).forEach((e: DealEvaluation) => {
          evalsMap.set(e.listingId, e);
        });

        if (listings.length > 0) {
          setLiveListings(listings);
          setLiveEvals(evalsMap);
          setIsLiveData(true);
        } else {
          setLiveListings(null);
          setLiveEvals(null);
          setIsLiveData(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[SearchPage] Edge function error, using mock data:', err);
        setLiveListings(null);
        setLiveEvals(null);
        setIsLiveData(false);
      } finally {
        if (!cancelled) setIsLiveLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [query]); // Re-run only on query change; filter changes apply client-side

  // Merge live + filtered results. Live takes priority over mock.
  const results = useMemo(() => {
    let list: Listing[] = liveListings
      ?? (query ? searchListings(ALL_LISTINGS, query, 0.3) : ALL_LISTINGS);

    // Client-side filters apply to both live and mock (live is already pre-filtered server-side,
    // but re-filtering handles changes made after the last fetch)
    if (filters.condition) list = list.filter(l => l.condition === filters.condition);
    if (filters.source) list = list.filter(l => l.source === filters.source);
    if (filters.maxPrice) list = list.filter(l => l.totalPrice <= Number(filters.maxPrice));
    if (filters.shippingIncluded) list = list.filter(l => l.shippingPrice === 0);

    return list;
  }, [query, filters, liveListings]);

  // Look up a deal evaluation — prefer live evals, fall back to mock
  const getEval = useCallback((id: string): DealEvaluation | undefined => {
    if (liveEvals) return liveEvals.get(id);
    return getEvaluation(id);
  }, [liveEvals]);

  const flagged = useMemo(() => results.filter(l => getEval(l.id)?.flagged), [results, getEval]);
  const unflagged = useMemo(() => results.filter(l => !getEval(l.id)?.flagged), [results, getEval]);

  const isSaved = isSearchSaved(query);

  function handleSaveSearch() {
    if (!user) { navigate(`/login?returnTo=/search?q=${encodeURIComponent(query)}`); return; }
    if (isSaved) { toast('Already saved.'); return; }
    if (!canSaveMore) { setShowUpgradePrompt(true); return; }
    saveSearch(query, filters);
    toast.success('Search saved to your watchlist.');
  }

  function handleSearch(q: string) {
    setParams({ q });
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Search header */}
      <div className="bg-white border-b border-gray-100 py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <SearchBar defaultValue={query} onSearch={handleSearch} size="md" />
          {query && <FilterBar filters={filters} onChange={setFilters} />}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* No query yet */}
        {!query && (
          <EmptyState
            icon={Search}
            title="What are you looking for?"
            description="Search for any product and Flippit will surface listings that appear priced below comparable ones."
          />
        )}

        {query && (
          <>
            {/* Loading state */}
            {isLiveLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-sm">Searching eBay, Mercari, Facebook Marketplace, OfferUp &amp; Google Shopping…</p>
              </div>
            )}

            {!isLiveLoading && (
              <>
                {/* Results header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-500">
                      {results.length === 0
                        ? 'No results'
                        : `${results.length} result${results.length === 1 ? '' : 's'} for `}
                      {results.length > 0 && <span className="font-medium text-gray-900">"{query}"</span>}
                    </p>
                    {isLiveData && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full border border-indigo-100">
                        <Zap className="w-3 h-3" /> Live
                      </span>
                    )}
                  </div>

                  {results.length > 0 && (
                    <button
                      onClick={handleSaveSearch}
                      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isSaved
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {isSaved ? 'Saved' : 'Save search'}
                    </button>
                  )}
                </div>

                {showUpgradePrompt && (
                  <div className="mb-6">
                    <UpgradePrompt message="You've used all 3 saved searches on the free plan." />
                  </div>
                )}

                {/* No results */}
                {results.length === 0 && (
                  <EmptyState
                    icon={Search}
                    title="No results found"
                    description="Try a broader search term or different product name."
                  />
                )}

                {/* Flagged deals section */}
                {flagged.length > 0 && (
                  <div className="mb-10">
                    <SectionHeader
                      title="Flagged Deals"
                      subtitle={`${flagged.length} listing${flagged.length === 1 ? '' : 's'} that appear underpriced`}
                      badge={
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-100">
                          <Zap className="w-3 h-3" /> Live
                        </span>
                      }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {flagged.map(l => (
                        <ListingCard
                          key={l.id}
                          listing={l}
                          evaluation={getEval(l.id)}
                          onSave={() => {
                            if (!user) { navigate(`/login?returnTo=/search?q=${encodeURIComponent(query)}`); return; }
                            if (isSaved) { toast('Search already saved.'); return; }
                            if (!canSaveMore) { setShowUpgradePrompt(true); return; }
                            saveSearch(query, filters);
                            toast.success('Search saved to your watchlist.');
                          }}
                          isSaved={savedSearches.some(s => s.query === query)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No flagged deals */}
                {flagged.length === 0 && results.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8 text-center shadow-card">
                    <p className="text-sm text-gray-500">No flagged deals found for this search right now.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      <Link to="/login" className="text-indigo-500 hover:underline">Save this search</Link> to get notified when deals appear.
                    </p>
                  </div>
                )}

                {/* All results */}
                {unflagged.length > 0 && (
                  <div>
                    <SectionHeader
                      title="All Results"
                      subtitle="Sorted by relevance"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unflagged.map(l => (
                        <ListingCard key={l.id} listing={l} evaluation={getEval(l.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
