import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Feature {
  text: string;
  included: boolean;
}

interface Props {
  name: string;
  price: string;
  description: string;
  features: Feature[];
  highlighted?: boolean;
  ctaLabel: string;
  onCta: () => void;
  badge?: string;
}

export default function PricingPlanCard({ name, price, description, features, highlighted, ctaLabel, onCta, badge }: Props) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl p-6 border',
        highlighted
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-200'
          : 'bg-white border-gray-200 text-gray-900 shadow-card'
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">{badge}</span>
        </div>
      )}

      <div className="mb-4">
        <h3 className={cn('text-sm font-semibold uppercase tracking-wide', highlighted ? 'text-indigo-200' : 'text-gray-500')}>
          {name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold">{price}</span>
          {price !== 'Free' && <span className={cn('text-sm', highlighted ? 'text-indigo-300' : 'text-gray-500')}>/month</span>}
        </div>
        <p className={cn('text-sm mt-2', highlighted ? 'text-indigo-200' : 'text-gray-500')}>{description}</p>
      </div>

      <ul className="space-y-3 flex-1 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
              f.included
                ? highlighted ? 'bg-indigo-400' : 'bg-emerald-100'
                : highlighted ? 'bg-indigo-700' : 'bg-gray-100'
            )}>
              <Check className={cn('w-2.5 h-2.5', f.included
                ? highlighted ? 'text-white' : 'text-emerald-600'
                : highlighted ? 'text-indigo-500' : 'text-gray-300'
              )} />
            </div>
            <span className={cn(
              'text-sm',
              f.included
                ? highlighted ? 'text-white' : 'text-gray-700'
                : highlighted ? 'text-indigo-400' : 'text-gray-400'
            )}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
          highlighted
            ? 'bg-white text-indigo-600 hover:bg-indigo-50'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        )}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
