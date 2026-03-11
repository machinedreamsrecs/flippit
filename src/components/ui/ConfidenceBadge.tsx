import type { ConfidenceScore } from '../../data/types';
import { cn } from '../../lib/utils';

const config: Record<ConfidenceScore, { label: string; className: string }> = {
  High:   { label: 'High confidence',   className: 'text-emerald-700 bg-emerald-50' },
  Medium: { label: 'Medium confidence', className: 'text-amber-700 bg-amber-50' },
  Low:    { label: 'Low confidence',    className: 'text-gray-500 bg-gray-100' },
};

export default function ConfidenceBadge({ score }: { score: ConfidenceScore }) {
  const { label, className } = config[score];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', className)}>
      {label}
    </span>
  );
}
