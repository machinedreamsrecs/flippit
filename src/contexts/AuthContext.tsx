import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../data/types';
import { MOCK_FREE_USER } from '../data/mockUsers';

const AUTH_KEY = 'flippit_auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // Mock auth — accept any credentials, use email as name
    const mockUser: User = {
      ...MOCK_FREE_USER,
      email,
      name: email.split('@')[0].replace(/[._]/g, ' '),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
