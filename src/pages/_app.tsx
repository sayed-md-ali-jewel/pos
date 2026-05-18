import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useAuthStore } from '@/store/authStore';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AppDialogProvider } from '@/components/Common/AppDialog';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    useAuthStore.getState().loadFromStorage();

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  return (
    <AppDialogProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </AppDialogProvider>
  );
}

export default MyApp;
