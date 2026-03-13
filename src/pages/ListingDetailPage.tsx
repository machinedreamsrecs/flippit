import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink, ArrowLeft, MapPin, Star, Package, Info, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import type { Listing, DealEvaluation } from '../data/types';
import { formatPrice, timeAgo } from '../lib/utils';
import DealScoreBadge from '../components/ui/DealScoreBadge';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import ListingCard from '../components/ui/ListingCard';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

interface ComparableGroupInfo {
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canSaveMore, saveProduct, isProductSaved } = useUser();

  const stateData = location.state as { listing?: Listing; evaluation?: DealEvaluation } | null;

  const [listing, setListing] = useState<Listing | undefined>(stateData?.listing);
  const [evaluation, setEvaluation] = useState<DealEvaluation | undefined>(stateData?.evaluation);
  const [comparables, setComparables] = useState<Listing[]>([]);
  const [group, setGroup] = useState<ComparableGroupInfo | null>(null);
  const [loading, setLoading] = useState(!stateData?.listing);

  // Load from DB when navigated directly (no router state)
  useEffect(() => {
    if (stateData?.listing || !id) return;

    async function loadListing() {
      setLoading(true);
      try {
        // Fetch listing + evaluation together
        const { data: evalRow, error } = await supabase
          .from('deal_evaluations')
          .select('*, listing:listings(id, source, external_url, title, normalized_title, image_url, price, shipping_price, currency, condition, seller_name, seller_rating, location, description, category, created_at, posted_at)')
          .eq('listing_id', id!)
          .maybeSingle();

        if (error) throw error;

        if (evalRow?.listing) {
          const l = evalRow.listing as Record<string, unknown>;
          const mapped: Listing = {
            id: l.id as string,
            source: l.source as Listing['source'],
            externalUrl: (l.external_url ?? '') as string,
            title: (l.title ?? '') as string,
            normalizedTitle: (l.normalized_title ?? '') as string,
            imageUrl: (l.image_url ?? '') as string,
            price: parseFloat(String(l.price)) || 0,
            shippingPrice: parseFloat(String(l.shipping_price)) || 0,
            totalPrice: (parseFloat(String(l.price)) || 0) + (parseFloat(String(l.shipping_price)) || 0),
            currency: 'USD',
            condition: (l.condition ?? 'Good') as Listing['condition'],
            sellerName: (l.seller_name ?? '') as string,
            sellerRating: (l.seller_rating ?? null) as number | null,
            location: (l.location ?? '') as string,
            description: (l.description ?? '') as string,
            createdAt: (l.created_at ?? '') as string,
            postedAt: (l.posted_at ?? '') as string,
            category: (l.category ?? '') as string,
          };
          setListing(mapped);

          const eval_: DealEvaluation = {
            id: evalRow.id as string,
            listingId: evalRow.listing_id as string,
            comparableGroupId: evalRow.comparable_group_id as string,
            dealScore: evalRow.deal_score as DealEvaluation['dealScore'],
            confidenceScore: evalRow.confidence_score as DealEvaluation['confidenceScore'],
            estimatedSavings: parseFloat(String(evalRow.estimated_savings)) || 0,
            flagReason: (evalRow.flag_reason ?? '') as string,
            flagged: evalRow.flagged as boolean,
          };
          setEvaluation(eval_);

          // Fetch comparable group info
          if (evalRow.comparable_group_id) {
            const { data: grp } = await supabase
              .from('comparable_groups')
              .select('median_price, low_price, high_price')
              .eq('id', evalRow.comparable_group_id)
              .maybeSingle();

            if (grp) {
              setGroup({
                medianPrice: parseFloat(String(grp.median_price)) || 0,
                lowPrice: parseFloat(String(grp.low_price)) || 0,
                highPrice: parseFloat(String(grp.high_price)) || 0,
              });

              // Fetch comparable listings (same group, excluding this listing)
              const { data: compEvals } = await supabase
                .from('deal_evaluations')
                .select('listing:listings(id, source, external_url, title, normalized_title, image_url, price, shipping_price, currency, condition, seller_name, seller_rating, location, description, category, created_at, posted_at)')
                .eq('comparable_group_id', evalRow.comparable_group_id)
                .neq('listing_id', id!)
                .limit(6);

              if (compEvals) {
                const compListings: Listing[] = compEvals
                  .filter(r => r.listing)
                  .map(r => {
                    const cl = r.listing as unknown as Record<string, unknown>;
                    return {
                      id: cl.id as string,
                      source: cl.source as Listing['source'],
                      externalUrl: (cl.external_url ?? '') as string,
                      title: (cl.title ?? '') as string,
                      normalizedTitle: (cl.normalized_title ?? '') as string,
                      imageUrl: (cl.image_url ?? '') as string,
                      price: parseFloat(String(cl.price)) || 0,
                      shippingPrice: parseFloat(String(cl.shipping_price)) || 0,
                      totalPrice: (parseFloat(String(cl.price)) || 0) + (parseFloat(String(cl.shipping_price)) || 0),
                      currency: 'USD',
                      condition: (cl.condition ?? 'Good') as Listing['condition'],
                      sellerName: (cl.seller_name ?? '') as string,
                      sellerRating: (cl.seller_rating ?? null) as number | null,
                      location: (cl.location ?? '') as string,
                      description: (cl.description ?? '') as string,
                      createdAt: (cl.created_at ?? '') as string,
                      postedAt: (cl.posted_at ?? '') as string,
                      category: (cl.category ?? '') as string,
                    };
                  });
                setComparables(compListings);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load listing:', err);
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [id, stateData?.listing]);

  const isSaved = isProductSaved(listing?.id ?? '');

  async function handleWatch() {
    if (!user) {
      navigate(`/login?returnTo=/listing/${listing!.id}`);
      return;
    }
    if (isSaved) { toast('Already saved.'); return; }
    if (!canSaveMore) {
      toast.error("You've reached the free plan limit. Upgrade to save more.");
      return;
    }
    try {
      await saveProduct(listing!);
      toast.success('Saved to your watchlist.');
    } catch {
      toast.error('Could not save this listing.');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <EmptyState icon={Package} title="Listing not found" description="This listing may have been removed or the URL is incorrect." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back + Watch row */}
        <div className="flex items-center justify-between mb-6">
          <Link to={-1 as never} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to results
          </Link>
          <button
            onClick={handleWatch}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              isSaved
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? 'Saved' : 'Save product'}
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Image + Deal Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Image */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Deal evaluation panel */}
            {evaluation && evaluation.flagged && (
              <div className="bg-white rounded-2xl border border-emerald-100 shadow-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DealScoreBadge score={evaluation.dealScore} size="md" />
                  <ConfidenceBadge score={evaluation.confidenceScore} />
                </div>

                {evaluation.estimatedSavings > 0 && (
                  <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-emerald-600 font-medium">Estimated savings</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatPrice(evaluation.estimatedSavings)}
                    </p>
                    {group && (
                      <p className="text-xs text-emerald-600 mt-0.5">vs. median of {formatPrice(group.medianPrice)}</p>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-0.5">Why this was flagged</p>
                    <p className="text-sm text-gray-600">{evaluation.flagReason}</p>
                  </div>
                </div>
              </div>
            )}

            {evaluation && !evaluation.flagged && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                <DealScoreBadge score="None" size="md" />
                <p className="text-sm text-gray-500 mt-3">This listing doesn't appear significantly underpriced compared to similar listings.</p>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{listing.source}</span>
                {listing.category && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{listing.category}</span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">{listing.title}</h1>

              {/* Pricing */}
              <div className="flex flex-wrap gap-6 mb-5">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Listed price</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(listing.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Shipping</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {listing.shippingPrice === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(listing.shippingPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(listing.totalPrice)}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Condition</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                    listing.condition === 'New' ? 'bg-blue-50 text-blue-700' :
                    listing.condition === 'Like New' ? 'bg-emerald-50 text-emerald-700' :
                    listing.condition === 'Good' ? 'bg-gray-100 text-gray-600' :
                    listing.condition === 'Fair' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {listing.condition}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Posted</p>
                  <p className="text-sm font-medium text-gray-700">{timeAgo(listing.postedAt)}</p>
                </div>
                {listing.location && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-700">{listing.location}</p>
                  </div>
                )}
                {listing.sellerName && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Seller</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-700 truncate">{listing.sellerName}</p>
                      {listing.sellerRating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="w-3 h-3 fill-current" />
                          {listing.sellerRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {listing.description && (
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-1.5">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
                </div>
              )}

              {listing.externalUrl ? (
                listing.externalUrl.startsWith('/') ? (
                  <Link
                    to={listing.externalUrl}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    View on Flippit Market
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                ) : (
                  <a
                    href={listing.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    View Listing on {listing.source}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-400 font-semibold rounded-xl cursor-not-allowed">
                  Listing URL unavailable
                </div>
              )}
            </div>

            {/* Comparable listings */}
            {comparables.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Comparable Listings</h2>
                {group && (
                  <p className="text-sm text-gray-500 mb-4">
                    Range across {comparables.length + 1} similar listings: {formatPrice(group.lowPrice)} – {formatPrice(group.highPrice)}
                    <span className="ml-2 font-medium text-gray-700">Median: {formatPrice(group.medianPrice)}</span>
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {comparables.slice(0, 6).map(l => (
                    <ListingCard key={l.id} listing={l} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
