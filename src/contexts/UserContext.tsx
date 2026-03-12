import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Listing, SavedProduct } from '../data/types';
import { useAuth } from './AuthContext';
import { supabase } from '../integrations/supabase/client';

const MAX_SAVED_FREE = 3;

interface UserContextValue {
  savedProducts: SavedProduct[];
  canSaveMore: boolean;
  maxSaved: number;
  saveProduct: (listing: Listing) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  isProductSaved: (listingId: string) => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToSavedProduct(row: Record<string, any>): SavedProduct {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    listingId: row.listing_id as string,
    listing: row.listing as Listing,
    savedAt: row.saved_at as string,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  useEffect(() => {
    if (!user) { setSavedProducts([]); return; }

    supabase
      .from('saved_products')
      .select('*, listing:listings(*)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedProducts(data.map(dbRowToSavedProduct));
      });
  }, [user]);

  const maxSaved = user?.plan === 'pro' ? Infinity : MAX_SAVED_FREE;
  const canSaveMore = savedProducts.length < maxSaved;

  const saveProduct = useCallback(async (listing: Listing) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_products')
      .insert({ user_id: user.id, listing_id: listing.id })
      .select('*, listing:listings(*)')
      .single();

    if (error) throw new Error(error.message);
    if (data) setSavedProducts(prev => [dbRowToSavedProduct(data), ...prev]);
  }, [user]);

  const removeProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from('saved_products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setSavedProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const isProductSaved = useCallback((listingId: string) => {
    return savedProducts.some(p => p.listingId === listingId);
  }, [savedProducts]);

  return (
    <UserContext.Provider value={{ savedProducts, canSaveMore, maxSaved, saveProduct, removeProduct, isProductSaved }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
