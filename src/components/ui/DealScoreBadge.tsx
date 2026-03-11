import type { DealScore } from '../../data/types';
import { cn } from '../../lib/utils';

const config: Record<DealScore, { label: string; className: string }> = {
  Strong: { label: 'Strong Deal', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Good:   { label: 'Good Deal',   className: 'bg-green-50 text-green-700 border-green-200' },
  Possible: { label: 'Possible Deal', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  None:   { label: 'No Deal',     className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

interface Props {
  score: DealScore;
  size?: 'sm' | 'md';
}

export default function DealScoreBadge({ score, size = 'sm' }: Props) {
  const { label, className } = config[score];
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {score !== 'None' && (
        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', {
          'bg-emerald-500': score === 'Strong',
          'bg-green-500': score === 'Good',
          'bg-amber-500': score === 'Possible',
        })} />
      )}
      {label}
    </span>
  );
}
