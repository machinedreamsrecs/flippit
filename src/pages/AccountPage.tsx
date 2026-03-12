import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Crown, Bookmark, Zap, CheckCircle, XCircle, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

const MAX_FREE = 3;

const FREE_FEATURES = [
  { text: '3 saved products', included: true },
  { text: 'Basic search results', included: true },
  { text: 'Limited flagged deals', included: true },
  { text: 'Delayed alerts', included: true },
  { text: 'Advanced filters', included: false },
  { text: 'Real-time alerts', included: false },
  { text: 'Unlimited saved products', included: false },
];

const PRO_FEATURES = [
  { text: 'Unlimited saved products', included: true },
  { text: 'Full search results', included: true },
  { text: 'All flagged deals', included: true },
  { text: 'Real-time alerts', included: true },
  { text: 'Advanced filters', included: true },
  { text: 'Deeper deal discovery', included: true },
  { text: 'Priority support', included: true },
];

export default function AccountPage() {
  const { user, logout, refreshUser } = useAuth();
  const { savedProducts } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!user) return null;
  const isPro = user.plan === 'pro';

  // Detect ?upgraded=true after Stripe redirect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      refreshUser().then(() => {
        toast.success("You're now on Pro! Welcome to Flippit Pro. 🎉");
        setSearchParams({}, { replace: true });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpgrade() {
    if (isUpgrading) return;
    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan: billingPeriod,
          returnUrl: window.location.href,
        },
      });

      if (error || !data?.success || !data?.url) {
        const msg = data?.error ?? error?.message ?? 'Could not start checkout';
        toast.error(msg);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error('[AccountPage] Checkout error:', err);
    } finally {
      setIsUpgrading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
    toast('Signed out.');
  }

  const savedCount = savedProducts.length;

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Account</h1>

        {/* Profile + plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-700 uppercase">{user.name.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Member since {formatDate(user.createdAt)}</p>
            </div>
            <div className="ml-auto">
              {isPro ? (
                <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Crown className="w-3.5 h-3.5" /> Pro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Usage summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-center">
            <Bookmark className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {savedCount}{isPro ? '' : <span className="text-gray-300">/{MAX_FREE}</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Saved products</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-center">
            <Zap className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 mt-1">{isPro ? 'Real-time' : 'Delayed'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Alert speed</p>
          </div>
        </div>

        {/* Plan cards */}
        <h2 className="text-base font-semibold text-gray-900 mb-4">Your Plan</h2>

        {/* Billing period toggle — only show when free */}
        {!isPro && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-4">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly · $12/mo
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual · $99/yr
              <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save $45</span>
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Free */}
          <div className={`relative bg-white rounded-2xl border p-5 shadow-card ${!isPro ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
            {!isPro && (
              <div className="absolute -top-2.5 left-4">
                <span className="bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Current plan</span>
              </div>
            )}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-1">Free</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1 mb-1">$0</p>
            <ul className="space-y-2 mt-4">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  {f.included
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className={`relative bg-indigo-600 rounded-2xl border p-5 text-white ${isPro ? 'ring-2 ring-indigo-400' : 'border-indigo-500'}`}>
            {isPro && (
              <div className="absolute -top-2.5 left-4">
                <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Current plan</span>
              </div>
            )}
            <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wide mt-1">Pro</h3>
            {billingPeriod === 'annual' && !isPro ? (
              <p className="text-3xl font-bold mt-1 mb-1">
                $99<span className="text-indigo-300 text-sm font-normal">/yr</span>
                <span className="ml-2 text-sm font-normal text-indigo-300">~$8.25/mo</span>
              </p>
            ) : (
              <p className="text-3xl font-bold mt-1 mb-1">$12<span className="text-indigo-300 text-sm font-normal">/mo</span></p>
            )}
            <ul className="space-y-2 mt-4">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-300 flex-shrink-0" />
                  <span className="text-sm text-white">{f.text}</span>
                </li>
              ))}
            </ul>
            {!isPro && (
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="mt-5 w-full py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  `Upgrade to Pro — ${billingPeriod === 'annual' ? '$99/yr' : '$12/mo'}`
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
