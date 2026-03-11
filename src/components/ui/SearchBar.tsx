import { Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  defaultValue?: string;
  onSearch: (query: string) => void;
  size?: 'md' | 'lg';
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ defaultValue = '', onSearch, size = 'lg', placeholder, className }: Props) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <div className={cn('relative flex-1', size === 'lg' ? 'text-base' : 'text-sm')}>
        <Search className={cn('absolute left-4 top-1/2 -translate-y-1/2 text-gray-400', size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder ?? (size === 'lg' ? 'Search any product — Dyson V15, Aeron chair, PSA 10 Charizard...' : 'Search products...')}
          className={cn(
            'w-full border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all',
            size === 'lg' ? 'pl-12 pr-4 py-4 text-base' : 'pl-10 pr-4 py-2.5 text-sm'
          )}
        />
      </div>
      <button
        type="submit"
        className={cn(
          'font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex-shrink-0',
          size === 'lg' ? 'px-6 py-4 text-base' : 'px-4 py-2.5 text-sm'
        )}
      >
        Search
      </button>
    </form>
  );
}
