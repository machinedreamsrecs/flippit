import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface Props {
  message?: string;
}

export default function UpgradePrompt({ message = "You've reached the free plan limit." }: Props) {
  return (
    <div className="flex items-start gap-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
      <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-indigo-900">{message}</p>
        <p className="text-sm text-indigo-700 mt-0.5">
          Upgrade to Flippit Pro for unlimited saved searches, faster alerts, and deeper deal discovery.
        </p>
      </div>
      <Link
        to="/account"
        className="flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
