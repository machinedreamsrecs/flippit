import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SavedSearch, SearchFilters } from '../data/types';
import { MOCK_SAVED_SEARCHES } from '../data/mockSavedSearches';
import { normalizeQuery } from '../lib/normalize';
import { useAuth } from './AuthContext';

const MAX_SAVED_FREE = 3;
const SAVED_KEY = 'flippit_saved_searches';

interface UserContextValue {
  savedSearches: SavedSearch[];
  canSaveMore: boolean;
  maxSaved: number;
  saveSearch: (query: string, filters: SearchFilters) => void;
  removeSearch: (id: string) => void;
  toggleAlert: (id: string) => void;
  isSearchSaved: (query: string) => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Seed mock data for returning mock users
  useEffect(() => {
    if (!user) { setSavedSearches([]); return; }
    try {
      const stored = localStorage.getItem(SAVED_KEY + '_' + user.id);
      if (stored) {
        setSavedSearches(JSON.parse(stored));
      } else {
        // Seed with mock data for the demo free user
        const seed = MOCK_SAVED_SEARCHES.filter(s => s.userId === user.id);
        setSavedSearches(seed);
      }
    } catch {
      setSavedSearches([]);
    }
  }, [user]);

  const persist = useCallback((searches: SavedSearch[]) => {
    if (!user) return;
    localStorage.setItem(SAVED_KEY + '_' + user.id, JSON.stringify(searches));
    setSavedSearches(searches);
  }, [user]);

  const maxSaved = user?.plan === 'pro' ? Infinity : MAX_SAVED_FREE;
  const canSaveMore = savedSearches.length < maxSaved;

  const saveSearch = useCallback((query: string, filters: SearchFilters) => {
    if (!user) return;
    const newSearch: SavedSearch = {
      id: `ss_${Date.now()}`,
      userId: user.id,
      query,
      normalizedQuery: normalizeQuery(query),
      filters,
      createdAt: new Date().toISOString(),
      alertsEnabled: false,
    };
    persist([...savedSearches, newSearch]);
  }, [user, savedSearches, persist]);

  const removeSearch = useCallback((id: string) => {
    persist(savedSearches.filter(s => s.id !== id));
  }, [savedSearches, persist]);

  const toggleAlert = useCallback((id: string) => {
    persist(savedSearches.map(s => s.id === id ? { ...s, alertsEnabled: !s.alertsEnabled } : s));
  }, [savedSearches, persist]);

  const isSearchSaved = useCallback((query: string) => {
    const norm = normalizeQuery(query);
    return savedSearches.some(s => s.normalizedQuery === norm);
  }, [savedSearches]);

  return (
    <UserContext.Provider value={{ savedSearches, canSaveMore, maxSaved, saveSearch, removeSearch, toggleAlert, isSearchSaved }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
