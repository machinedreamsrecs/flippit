import { Filter, Lock } from 'lucide-react';
import type { SearchFilters, Condition, ListingSource } from '../../data/types';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const CONDITIONS: Condition[] = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const SOURCES: ListingSource[] = ['eBay', 'Facebook Marketplace', 'Craigslist', 'Mercari', 'OfferUp', 'Poshmark'];

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mr-1">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      {/* Condition */}
      <select
        value={filters.condition ?? ''}
        onChange={e => onChange({ ...filters, condition: e.target.value as Condition | '' })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Any condition</option>
        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Source — Pro only */}
      <div className={cn('relative', !isPro && 'opacity-60 pointer-events-none')}>
        <select
          value={filters.source ?? ''}
          onChange={e => onChange({ ...filters, source: e.target.value as ListingSource | '' })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-7"
          disabled={!isPro}
        >
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {!isPro && (
          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
        )}
      </div>

      {/* Max price */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-500">Max</span>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            type="number"
            min={0}
            placeholder="Price"
            value={filters.maxPrice ?? ''}
            onChange={e => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : '' })}
            className="text-sm border border-gray-200 rounded-lg pl-6 pr-3 py-1.5 w-24 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Shipping toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => onChange({ ...filters, shippingIncluded: !filters.shippingIncluded })}
          className={cn(
            'w-8 h-4.5 rounded-full transition-colors relative cursor-pointer',
            filters.shippingIncluded ? 'bg-indigo-600' : 'bg-gray-200'
          )}
          style={{ width: 32, height: 18 }}
        >
          <div className={cn(
            'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
            filters.shippingIncluded ? 'translate-x-[14px]' : 'translate-x-0.5'
          )} />
        </div>
        <span className="text-sm text-gray-600">Free shipping</span>
      </label>

      {!isPro && (
        <a href="/account" className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
          <Lock className="w-3 h-3" /> Pro filters
        </a>
      )}
    </div>
  );
}
