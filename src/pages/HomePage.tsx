import { useNavigate, Link } from 'react-router-dom';
import { Search, Zap, TrendingDown, Bell, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';

const EXAMPLE_QUERIES = [
  'Dyson V15 Detect', 'Herman Miller Aeron', 'PSA 10 Charizard',
  'Sony WH-1000XM5', 'MacBook Air M2', 'Nike Vomero 5',
  "Arc'teryx Beta LT", 'Logitech MX Keys', 'DeWalt 20V Combo',
  'Michelin Pilot Sport 4S',
];

const STEPS = [
  {
    icon: Search,
    step: '01',
    title: 'Search what you want',
    description: 'Type any product name — as specific or broad as you like.',
  },
  {
    icon: TrendingDown,
    step: '02',
    title: 'Flippit compares listings',
    description: 'We scan and compare prices across listings to find the ones that stand out.',
  },
  {
    icon: Zap,
    step: '03',
    title: 'Buy when a strong deal appears',
    description: 'Save searches and get alerted when something worth acting on surfaces.',
  },
];

const FREE_FEATURES = [
  { text: '3 saved searches', included: true },
  { text: 'Basic search results', included: true },
  { text: 'Limited flagged deals per day', included: true },
  { text: 'Delayed alerts', included: true },
  { text: 'Advanced filters', included: false },
  { text: 'Real-time alerts', included: false },
  { text: 'Unlimited saved searches', included: false },
];

const PRO_FEATURES = [
  { text: 'Unlimited saved searches', included: true },
  { text: 'Full search results', included: true },
  { text: 'All flagged deals', included: true },
  { text: 'Real-time alerts', included: true },
  { text: 'Advanced filters (source, multi-condition)', included: true },
  { text: 'Deeper deal discovery', included: true },
  { text: 'Priority support', included: true },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Find deals before they're gone
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-5">
            Find underpriced listings<br />
            <span className="text-indigo-600">before you overpay.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Search for any product and Flippit surfaces listings that appear cheaper than comparable listings across the web.
          </p>

          <div className="max-w-2xl mx-auto mb-6">
            <SearchBar
              onSearch={q => navigate(`/search?q=${encodeURIComponent(q)}`)}
              size="lg"
            />
          </div>

          <a href="#how-it-works" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors gap-1">
            See how it works <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Example queries */}
      <section className="bg-gray-50 border-t border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide text-center mb-4">Popular searches</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Search once. Catch better deals faster.</h2>
            <p className="text-gray-500 text-lg">Three steps between you and a genuinely good price.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map(({ icon: Icon, step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-indigo-400 bg-white border border-indigo-100 rounded-full w-5 h-5 flex items-center justify-center">
                    {step.replace('0', '')}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="bg-gray-50 border-t border-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mt-2 mb-1">$0</div>
              <p className="text-sm text-gray-500 mb-6">Good for casual deal hunters.</p>
              <ul className="space-y-3">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {f.included
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="mt-6 block w-full py-2.5 text-center rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-indigo-600 rounded-2xl border border-indigo-500 p-6 shadow-xl shadow-indigo-200 text-white">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</span>
              </div>
              <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wide">Pro</h3>
              <div className="text-4xl font-bold mt-2 mb-1">$12<span className="text-indigo-300 text-base font-medium">/mo</span></div>
              <p className="text-sm text-indigo-200 mb-6">For serious buyers who don't miss deals.</p>
              <ul className="space-y-3">
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-indigo-300 flex-shrink-0" />
                    <span className="text-sm text-white">{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="mt-6 block w-full py-2.5 text-center rounded-xl text-sm font-semibold bg-white text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                Start with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Bell className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Save products and track strong deals</h2>
          <p className="text-gray-500 mb-7">Set up a watchlist and know when something worth buying appears.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
