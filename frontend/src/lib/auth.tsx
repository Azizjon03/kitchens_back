import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from './api';
import { resetEcho } from './echo';
import type { User } from '../types';

/** Bitta telefon bir nechta restoranda bir xil parol bilan — tanlov kerak (#10) */
export interface LoginAccount {
  user_id: number;
  role: string;
  company: { id: number; name: string; slug: string } | null;
}

export type LoginResult =
  | { status: 'ok'; user: User }
  | { status: 'select'; accounts: LoginAccount[]; selectionToken: string };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<LoginResult>;
  selectCompany: (selectionToken: string, userId: number) => Promise<User>;
  logout: () => void;
}

/** Login'dan keyin rolning ish ekrani: oshpaz KDS'ga, ofitsiant zalga, kassir kassaga */
export function homePathFor(role?: string): string {
  switch (role) {
    case 'chef': return '/kitchen';
    case 'waiter': return '/waiter';
    case 'cashier': return '/cash-shifts';
    default: return '/dashboard';
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const storeSession = useCallback((token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = useCallback(async (phone: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/login', { phone, password });

    if (data.data.requires_company_selection) {
      return { status: 'select', accounts: data.data.accounts, selectionToken: data.data.selection_token };
    }

    storeSession(data.data.token, data.data.user);
    return { status: 'ok', user: data.data.user };
  }, [storeSession]);

  const selectCompany = useCallback(async (selectionToken: string, userId: number) => {
    const { data } = await api.post('/auth/login/select', { selection_token: selectionToken, user_id: userId });
    storeSession(data.data.token, data.data.user);
    return data.data.user as User;
  }, [storeSession]);

  const logout = useCallback(() => {
    // Tokenni serverda ham bekor qilamiz — aks holda u muddati tugaguncha (7 kun) amal qiladi.
    // Javob kutilmaydi: tarmoq bo'lmasa ham foydalanuvchi baribir chiqadi.
    const token = localStorage.getItem('access_token');
    if (token) {
      api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    resetEcho();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, selectCompany, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
