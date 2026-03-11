import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="text-sm font-medium text-gray-700">flippit</span>
            <span className="text-sm text-gray-400">· Find underpriced listings before you overpay.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link to="/search" className="hover:text-gray-600 transition-colors">Search</Link>
            <Link to="/account" className="hover:text-gray-600 transition-colors">Pricing</Link>
            <span>© {new Date().getFullYear()} Flippit</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
