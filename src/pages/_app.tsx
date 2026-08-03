import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import {
  AUTH_INACTIVITY_TIMEOUT_MS,
  AUTH_LAST_ACTIVITY_KEY,
  useAuthStore,
} from '@/store/authStore';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AppDialogProvider } from '@/components/Common/AppDialog';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    useAuthStore.getState().loadFromStorage();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }

    const handleChunkError = (event: ErrorEvent) => {
      if (/Loading chunk [\d]+ failed/.test(event.message || '')) {
        window.location.reload();
      }
    };
    window.addEventListener('error', handleChunkError);

    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: number | null = null;
    let lastRecordedActivity = 0;

    const logoutForInactivity = () => {
      useAuthStore.getState().clearAuth();
      toast.error('You were logged out after 1 hour of inactivity');
      router.push('/auth/login');
    };

    const scheduleTimeout = () => {
      if (timeoutId) window.clearTimeout(timeoutId);

      const lastActivity = Number(localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || Date.now());
      const elapsed = Date.now() - lastActivity;
      const remaining = AUTH_INACTIVITY_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        logoutForInactivity();
        return;
      }

      timeoutId = window.setTimeout(logoutForInactivity, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();

      if (now - lastRecordedActivity < 30 * 1000) {
        return;
      }

      lastRecordedActivity = now;
      localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
      scheduleTimeout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastActivity = Number(localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || 0);
        if (Date.now() - lastActivity > AUTH_INACTIVITY_TIMEOUT_MS) {
          logoutForInactivity();
          return;
        }
        recordActivity();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token' && !event.newValue) {
        useAuthStore.getState().clearAuth();
        router.push('/auth/login');
      }

      if (event.key === AUTH_LAST_ACTIVITY_KEY) {
        scheduleTimeout();
      }
    };

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'focus'];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    recordActivity();
    scheduleTimeout();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated, router]);

  return (
    <AppDialogProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </AppDialogProvider>
  );
}

export default MyApp;
