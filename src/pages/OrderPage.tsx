import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, CheckCircle, Truck, MapPin, Loader2,
  Clock, AlertCircle, ExternalLink, Box,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import type { Order } from '../data/types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/ui/EmptyState';

interface OrderWithListing extends Order {
  listing: {
    id: string;
    title: string;
    images: string[];
    condition: string;
    category: string;
  } | null;
}

const STATUS_STEPS: Order['status'][] = [
  'awaiting_payment',
  'paid',
  'label_created',
  'shipped',
  'delivered',
  'complete',
];

const STATUS_LABELS: Record<Order['status'], string> = {
  awaiting_payment: 'Awaiting Payment',
  paid: 'Payment Confirmed',
  label_created: 'Label Created',
  shipped: 'Shipped',
  delivered: 'Delivered',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

function StatusTimeline({ status }: { status: Order['status'] }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">Order Cancelled</span>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex flex-col items-center gap-1`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                done
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-300'
              }`}>
                {done && !active ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-indigo-700' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mb-5 flex-shrink-0 ${i < currentIdx ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderWithListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Shipping label form state
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, listing:flippit_listings(id, title, images, condition, category)`)
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setOrder({
          id: data.id,
          listingId: data.listing_id,
          buyerId: data.buyer_id,
          sellerId: data.seller_id,
          itemPrice: Number(data.item_price),
          platformFee: Number(data.platform_fee),
          salesTax: Number(data.sales_tax ?? 0),
          buyerTotal: Number(data.buyer_total),
          sellerPayout: data.seller_payout != null ? Number(data.seller_payout) : null,
          buyerName: data.buyer_name,
          buyerAddress: data.buyer_address as Order['buyerAddress'],
          status: data.status as Order['status'],
          stripeCheckoutSessionId: data.stripe_checkout_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          paidAt: data.paid_at,
          trackingNumber: data.tracking_number,
          carrier: data.carrier,
          shippingLabelUrl: data.shipping_label_url,
          estimatedDelivery: data.estimated_delivery,
          shippedAt: data.shipped_at,
          deliveredAt: data.delivered_at,
          createdAt: data.created_at,
          listing: data.listing as OrderWithListing['listing'],
        });
      }
      setIsLoading(false);
    })();
  }, [id]);

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setIsCreatingLabel(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const { data, error } = await supabase.functions.invoke('create-shipping-label', {
        body: {
          order_id: order.id,
          weight: Number(weight),
          length: Number(length),
          width: Number(width),
          height: Number(height),
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data?.success) {
        throw new Error(data?.error ?? error?.message ?? 'Label creation failed');
      }

      toast.success('Shipping label created! Download it below.');
      setOrder(prev => prev ? {
        ...prev,
        status: 'label_created',
        trackingNumber: data.tracking_number,
        carrier: data.carrier,
        shippingLabelUrl: data.label_url,
        estimatedDelivery: data.estimated_delivery,
      } : prev);
      setShowLabelForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Label creation failed.');
    } finally {
      setIsCreatingLabel(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <EmptyState icon={Package} title="Order not found" description="This order doesn't exist or you don't have access." />
        </div>
      </div>
    );
  }

  const isSeller = user?.id === order.sellerId;
  const isBuyer = user?.id === order.buyerId;
  const addr = order.buyerAddress;

  return (
    <div className="flex-1 bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={isSeller ? '/my-flips' : '/saved'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {isSeller ? 'My Flips' : 'My Orders'}
        </Link>

        <div className="space-y-4">
          {/* Status timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Order</h1>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                order.status === 'complete' ? 'bg-emerald-50 text-emerald-700' :
                order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                order.status === 'shipped' || order.status === 'delivered' ? 'bg-blue-50 text-blue-700' :
                'bg-indigo-50 text-indigo-700'
              }`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <StatusTimeline status={order.status} />
          </div>

          {/* Item */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Item</h2>
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {order.listing?.images?.[0] ? (
                  <img src={order.listing.images[0]} alt={order.listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Box className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                  {order.listing?.title ?? 'Item'}
                </p>
                <p className="text-xs text-gray-400">{order.listing?.condition} · {order.listing?.category}</p>
                <Link
                  to={`/flip/${order.listingId}`}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 inline-flex items-center gap-0.5"
                >
                  View listing <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              {isSeller ? 'Payout breakdown' : 'Order summary'}
            </h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Item price</span><span>{formatPrice(order.itemPrice)}</span>
              </div>
              {isBuyer && order.salesTax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Sales tax</span><span>{formatPrice(order.salesTax)}</span>
                </div>
              )}
              {isBuyer && (
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5 mt-1">
                  <span>Total charged</span><span>{formatPrice(order.buyerTotal)}</span>
                </div>
              )}
              {isSeller && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (12%)</span><span>− {formatPrice(order.platformFee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700 border-t border-gray-100 pt-1.5 mt-1">
                    <span>Your payout</span>
                    <span>{order.sellerPayout != null ? formatPrice(order.sellerPayout) : 'Pending'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shipping address (visible to seller after payment, always visible to buyer) */}
          {addr && (isSeller || isBuyer) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {isSeller ? 'Ship to' : 'Shipping address'}
              </h2>
              <div className="text-sm text-gray-700 space-y-0.5">
                {order.buyerName && <p className="font-medium">{order.buyerName}</p>}
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{addr.city}, {addr.state} {addr.zip}</p>
                <p>{addr.country}</p>
              </div>
            </div>
          )}

          {/* Tracking info (when available) */}
          {order.trackingNumber && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" /> Tracking
              </h2>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="text-gray-400">Carrier: </span>
                  <span className="font-medium">{order.carrier}</span>
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-400">Tracking #: </span>
                  <span className="font-mono font-medium">{order.trackingNumber}</span>
                </p>
                {order.estimatedDelivery && (
                  <p className="text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Est. delivery: <span className="font-medium">{order.estimatedDelivery}</span>
                  </p>
                )}
                {order.shippingLabelUrl && isSeller && (
                  <a
                    href={order.shippingLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                  >
                    Download label <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Seller: create shipping label (when paid, no label yet) */}
          {isSeller && order.status === 'paid' && !order.shippingLabelUrl && (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-500" /> Create Shipping Label
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Enter package dimensions to purchase a label via EasyPost. The cheapest rate will be selected automatically.
              </p>

              {!showLabelForm ? (
                <button
                  onClick={() => setShowLabelForm(true)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Create Label
                </button>
              ) : (
                <form onSubmit={handleCreateLabel} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lbs)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="1.5"
                        step="0.1"
                        min="0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Length (in)</label>
                      <input
                        type="number"
                        value={length}
                        onChange={e => setLength(e.target.value)}
                        placeholder="12"
                        step="0.5"
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Width (in)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={e => setWidth(e.target.value)}
                        placeholder="8"
                        step="0.5"
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Height (in)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(e.target.value)}
                        placeholder="6"
                        step="0.5"
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLabelForm(false)}
                      className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingLabel}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {isCreatingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                      {isCreatingLabel ? 'Creating…' : 'Purchase Label'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Awaiting payment notice */}
          {order.status === 'awaiting_payment' && isBuyer && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">Payment is pending. If you didn't complete checkout, return to the listing to pay.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
