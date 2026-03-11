import { useParams, Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, MapPin, Star, Package, Info } from 'lucide-react';
import { ALL_LISTINGS, getEvaluation, getComparableListings, getComparableGroup } from '../data/mockListings';
import { formatPrice, timeAgo } from '../lib/utils';
import DealScoreBadge from '../components/ui/DealScoreBadge';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import ListingCard from '../components/ui/ListingCard';
import EmptyState from '../components/ui/EmptyState';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listing = ALL_LISTINGS.find(l => l.id === id);

  if (!listing) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <EmptyState icon={Package} title="Listing not found" description="This listing may have been removed or the URL is incorrect." />
        </div>
      </div>
    );
  }

  const evaluation = getEvaluation(listing.id);
  const comparables = getComparableListings(listing.id);
  const group = getComparableGroup(listing.id);

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link to={-1 as never} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to results
        </Link>

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
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{listing.category}</span>
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

              <a
                href={listing.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                View Listing on {listing.source}
                <ExternalLink className="w-4 h-4" />
              </a>
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
