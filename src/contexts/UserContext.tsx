import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SavedSearch, SearchFilters } from '../data/types';
import { normalizeQuery } from '../lib/normalize';
import { useAuth } from './AuthContext';
import { supabase } from '../integrations/supabase/client';

const MAX_SAVED_FREE = 3;

interface UserContextValue {
  savedSearches: SavedSearch[];
  canSaveMore: boolean;
  maxSaved: number;
  saveSearch: (query: string, filters: SearchFilters) => Promise<void>;
  removeSearch: (id: string) => Promise<void>;
  toggleAlert: (id: string) => Promise<void>;
  isSearchSaved: (query: string) => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

function dbRowToSavedSearch(row: Record<string, unknown>): SavedSearch {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    query: row.query as string,
    normalizedQuery: row.normalized_query as string,
    filters: (row.filters as SearchFilters) ?? {},
    createdAt: row.created_at as string,
    alertsEnabled: row.alerts_enabled as boolean,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    if (!user) { setSavedSearches([]); return; }

    supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedSearches(data.map(dbRowToSavedSearch));
      });
  }, [user]);

  const maxSaved = user?.plan === 'pro' ? Infinity : MAX_SAVED_FREE;
  const canSaveMore = savedSearches.length < maxSaved;

  const saveSearch = useCallback(async (query: string, filters: SearchFilters) => {
    if (!user) return;
    const row = {
      user_id: user.id,
      query,
      normalized_query: normalizeQuery(query),
      filters,
      alerts_enabled: false,
    };
    const { data, error } = await supabase
      .from('saved_searches')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) setSavedSearches(prev => [dbRowToSavedSearch(data), ...prev]);
  }, [user]);

  const removeSearch = useCallback(async (id: string) => {
    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleAlert = useCallback(async (id: string) => {
    const target = savedSearches.find(s => s.id === id);
    if (!target) return;
    const newVal = !target.alertsEnabled;
    const { error } = await supabase
      .from('saved_searches')
      .update({ alerts_enabled: newVal })
      .eq('id', id);
    if (error) throw new Error(error.message);
    setSavedSearches(prev => prev.map(s => s.id === id ? { ...s, alertsEnabled: newVal } : s));
  }, [savedSearches]);

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
