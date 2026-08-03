import { create } from 'zustand';
import { User } from '@/types';

export const AUTH_LAST_ACTIVITY_KEY = 'auth:lastActivity';
export const AUTH_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadFromStorage: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const lastActivity = Number(localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || 0);
      const isExpired =
        Boolean(token && user) && Date.now() - lastActivity > AUTH_INACTIVITY_TIMEOUT_MS;

      if (isExpired) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      } else if (token && user) {
        localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
        set({
          token,
          user: JSON.parse(user),
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    }
  },
}));
