import { cn } from '../../lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, badge, className }: Props) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
