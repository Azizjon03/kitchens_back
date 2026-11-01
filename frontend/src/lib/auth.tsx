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

/** #37: birinchi kirish — rasmiy botdan kelgan kod bilan tasdiqlash */
export interface TelegramChallenge {
  nonce: string;
  botUrl: string | null;
  codeSent: boolean;
}

export type LoginResult =
  | { status: 'ok'; user: User }
  | { status: 'select'; accounts: LoginAccount[]; selectionToken: string }
  | { status: 'telegram'; challenge: TelegramChallenge };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<LoginResult>;
  selectCompany: (selectionToken: string, userId: number) => Promise<LoginResult>;
  verifyTelegram: (nonce: string, code: string) => Promise<LoginResult>;
  /** Xodimlar boti Mini App'i: initData bilan parolsiz kirish */
  loginWithTelegram: (initData: string) => Promise<LoginResult>;
  /** Xodimlar boti Mini App'i: birinchi kirish — parol, keyin shu chatga kod */
  linkTelegram: (initData: string, phone: string, password: string) => Promise<LoginResult>;
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

  /** Kirish javobi: token, restoran tanlovi yoki Telegram kodi */
  const handleAuth = useCallback((d: Record<string, unknown>): LoginResult => {
    if (d.requires_telegram_verification) {
      return {
        status: 'telegram',
        challenge: { nonce: d.nonce as string, botUrl: (d.bot_url as string | null) ?? null, codeSent: !!d.code_sent },
      };
    }
    if (d.requires_company_selection) {
      return { status: 'select', accounts: d.accounts as LoginAccount[], selectionToken: d.selection_token as string };
    }
    storeSession(d.token as string, d.user as User);
    return { status: 'ok', user: d.user as User };
  }, [storeSession]);

  const login = useCallback(async (phone: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/login', { phone, password });
    return handleAuth(data.data);
  }, [handleAuth]);

  const selectCompany = useCallback(async (selectionToken: string, userId: number) => {
    const { data } = await api.post('/auth/login/select', { selection_token: selectionToken, user_id: userId });
    return handleAuth(data.data);
  }, [handleAuth]);

  const verifyTelegram = useCallback(async (nonce: string, code: string) => {
    const { data } = await api.post('/auth/telegram/verify', { nonce, code });
    return handleAuth(data.data);
  }, [handleAuth]);

  const loginWithTelegram = useCallback(async (initData: string) => {
    const { data } = await api.post('/auth/telegram/staff', { init_data: initData });
    return handleAuth(data.data);
  }, [handleAuth]);

  const linkTelegram = useCallback(async (initData: string, phone: string, password: string) => {
    const { data } = await api.post('/auth/telegram/staff/link', { init_data: initData, phone, password });
    return handleAuth(data.data);
  }, [handleAuth]);

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, selectCompany, verifyTelegram, loginWithTelegram, linkTelegram, logout }}>
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
