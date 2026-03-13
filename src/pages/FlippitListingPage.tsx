import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Tag, Gavel, User, Loader2, Package, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import type { FlippitListing, FlippitBid } from '../data/types';
import { dbRowToFlippitListing, calcFee, calcSellerPayout, feeLabel } from '../lib/flippit-fee';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/ui/EmptyState';

function timeUntil(isoDate: string): string {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Auction ended';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.floor(ms / 60_000)}m left`;
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d ${h % 24}h left`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FlippitListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState<FlippitListing | null>(null);
  const [bids, setBids] = useState<FlippitBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: l }, { data: b }] = await Promise.all([
        supabase.from('flippit_listings').select('*').eq('id', id).single(),
        supabase.from('flippit_bids').select('*').eq('listing_id', id).order('amount', { ascending: false }),
      ]);
      if (l) setListing(dbRowToFlippitListing(l) as FlippitListing);
      if (b) setBids(b.map(row => ({
        id: row.id,
        listingId: row.listing_id,
        bidderId: row.bidder_id,
        bidderName: row.bidder_name,
        amount: Number(row.amount),
        createdAt: row.created_at,
      })));
      setIsLoading(false);
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <EmptyState icon={Package} title="Listing not found" description="This listing may have been removed." />
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.sellerId;
  const isSold = listing.status === 'sold';
  const isBuyNow = listing.listingType === 'buy_now';
  const minNextBid = listing.currentBid ? listing.currentBid + 1 : (listing.startingBid ?? 0);

  async function handleBuyNow() {
    if (!user) { navigate(`/login?returnTo=/flip/${listing!.id}`); return; }
    if (isOwner) { toast.error("You can't buy your own listing."); return; }
    setIsBuying(true);
    try {
      const price = listing!.price!;
      const fee = calcFee(price);
      const payout = calcSellerPayout(price);

      const { error } = await supabase
        .from('flippit_listings')
        .update({
          status: 'sold',
          buyer_id: user.id,
          sale_price: price,
          platform_fee: fee,
          seller_payout: payout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing!.id)
        .eq('status', 'active'); // only if still active

      if (error) throw error;

      setListing(prev => prev ? { ...prev, status: 'sold', buyerId: user.id, salePrice: price, platformFee: fee, sellerPayout: payout } : prev);
      toast.success("You flipped it! 🔥 Purchase confirmed.");
      setShowConfirm(false);
    } catch (err) {
      toast.error('Purchase failed. The item may have already sold.');
    } finally {
      setIsBuying(false);
    }
  }

  async function handleBid() {
    if (!user) { navigate(`/login?returnTo=/flip/${listing!.id}`); return; }
    if (isOwner) { toast.error("You can't bid on your own listing."); return; }

    const amount = Number(bidAmount);
    if (!amount || amount < minNextBid) {
      toast.error(`Minimum bid is ${formatPrice(minNextBid)}`);
      return;
    }

    setIsBidding(true);
    try {
      // Insert bid
      const { error: bidError } = await supabase.from('flippit_bids').insert({
        listing_id: listing!.id,
        bidder_id: user.id,
        bidder_name: user.name,
        amount,
      });
      if (bidError) throw bidError;

      // Update listing current_bid and bid_count
      const { error: updateError } = await supabase
        .from('flippit_listings')
        .update({
          current_bid: amount,
          bid_count: listing!.bidCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing!.id);
      if (updateError) throw updateError;

      // Update local state
      const newBid: FlippitBid = {
        id: crypto.randomUUID(),
        listingId: listing!.id,
        bidderId: user.id,
        bidderName: user.name,
        amount,
        createdAt: new Date().toISOString(),
      };
      setBids(prev => [newBid, ...prev]);
      setListing(prev => prev ? { ...prev, currentBid: amount, bidCount: prev.bidCount + 1 } : prev);
      setBidAmount('');
      toast.success(`Bid of ${formatPrice(amount)} placed! 🎯`);
    } catch (err) {
      toast.error('Failed to place bid. Try again.');
    } finally {
      setIsBidding(false);
    }
  }

  const displayPrice = isBuyNow ? listing.price : (listing.currentBid ?? listing.startingBid);

  return (
    <div className="flex-1 bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          to="/market"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Flippit Market
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Images */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden aspect-[4/3]">
              {listing.images[selectedImg] ? (
                <img
                  src={listing.images[selectedImg]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Tag className="w-16 h-16" />
                </div>
              )}
            </div>

            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImg === i ? 'border-indigo-600' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Bid history */}
            {!isBuyNow && bids.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bid history ({bids.length})</h3>
                <div className="space-y-2.5">
                  {bids.slice(0, 8).map((bid, i) => (
                    <div key={bid.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-700 text-xs font-bold">{bid.bidderName.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-gray-700 font-medium">{bid.bidderName}</span>
                        {i === 0 && <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded">Highest</span>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(bid.amount)}</p>
                        <p className="text-xs text-gray-400">{timeAgo(bid.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Details + Action */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {isBuyNow ? (
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                    <Tag className="w-3 h-3" /> Buy Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                    <Gavel className="w-3 h-3" /> Auction
                  </span>
                )}
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{listing.condition}</span>
                <span className="text-xs text-gray-400">{listing.category}</span>
              </div>

              <h1 className="text-lg font-bold text-gray-900 leading-snug mb-4">{listing.title}</h1>

              {/* Price */}
              <div className="mb-4">
                {isSold ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-lg font-bold text-emerald-600">Sold for {formatPrice(listing.salePrice ?? 0)}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-0.5">
                      {isBuyNow ? 'Price' : (listing.bidCount > 0 ? `Current bid · ${listing.bidCount} bid${listing.bidCount === 1 ? '' : 's'}` : 'Starting bid')}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {displayPrice != null ? formatPrice(displayPrice) : '—'}
                    </p>
                    {!isBuyNow && listing.endsAt && (
                      <p className="flex items-center gap-1 text-sm text-amber-600 font-medium mt-1">
                        <Clock className="w-3.5 h-3.5" /> {timeUntil(listing.endsAt)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              {listing.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{listing.description}</p>
              )}

              {/* Location / seller */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-5">
                {listing.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                )}
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{listing.sellerName}</span>
              </div>

              {/* Action area */}
              {!isOwner && !isSold && (
                <>
                  {isBuyNow ? (
                    <>
                      {!showConfirm ? (
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 group"
                        >
                          <Zap className="w-4 h-4 group-hover:animate-pulse" />
                          Buy Now — {formatPrice(listing.price!)}
                        </button>
                      ) : (
                        <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-semibold text-indigo-900">Confirm your purchase</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between text-gray-600"><span>Item price</span><span>{formatPrice(listing.price!)}</span></div>
                          </div>
                          <p className="text-xs text-gray-500">Payment processed separately with the seller. Flippit coordinates the sale.</p>
                          <div className="flex gap-2">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button
                              onClick={handleBuyNow}
                              disabled={isBuying}
                              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                              {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                              {isBuying ? 'Confirming…' : 'Confirm — Flippit it!'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Auction bid form
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Your bid <span className="text-gray-400">(min {formatPrice(minNextBid)})</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={e => setBidAmount(e.target.value)}
                            placeholder={String(minNextBid)}
                            min={minNextBid}
                            step="1"
                            className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleBid}
                        disabled={isBidding}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        {isBidding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                        {isBidding ? 'Placing bid…' : 'Place Bid'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {isSold && (
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-emerald-700">This item has been sold.</p>
                  <Link to="/market" className="text-xs text-emerald-600 hover:underline mt-1 block">Browse more listings →</Link>
                </div>
              )}

              {isOwner && (
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 font-medium text-center">
                  This is your listing.
                </div>
              )}
            </div>

            {/* Fee info */}
            {!isSold && !isOwner && isBuyNow && listing.price != null && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700 mb-2">Seller fee breakdown</p>
                <div className="flex justify-between"><span>Sale price</span><span>{formatPrice(listing.price)}</span></div>
                <div className="flex justify-between"><span>{feeLabel(listing.price)}</span><span>− {formatPrice(calcFee(listing.price))}</span></div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1 mt-1">
                  <span>Seller receives</span><span className="text-emerald-600">{formatPrice(calcSellerPayout(listing.price))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
