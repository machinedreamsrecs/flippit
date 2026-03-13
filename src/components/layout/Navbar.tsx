import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bookmark, User, LogOut, ChevronDown, Tag, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync navbar search input with URL query when on the search page
  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchValue(searchParams.get('q') ?? '');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">flippit</span>
          </Link>

          {/* Market link */}
          <Link
            to="/market"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0"
          >
            <Tag className="w-4 h-4" />
            <span>Market</span>
          </Link>

          {/* Center search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto hidden sm:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder="Search any product..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <>
                {/* Sell CTA */}
                <Link
                  to="/sell/new"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                >
                  <Zap className="w-4 h-4" />
                  <span>Sell</span>
                </Link>

                <Link
                  to="/saved"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Saved</span>
                </Link>

                {/* User menu */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                      menuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-700 font-medium text-xs uppercase">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                    {user.plan === 'pro' && (
                      <span className="hidden sm:inline text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-medium">Pro</span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                      <Link
                        to="/my-flips"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Zap className="w-4 h-4 text-indigo-400" />
                        My Flips
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        Account
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4 text-gray-400" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/market"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Tag className="w-4 h-4" /> Market
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
