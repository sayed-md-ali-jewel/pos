// import React, { useEffect } from 'react';
// import type { AppProps } from 'next/app';
// import { useAuthStore } from '@/store/authStore';
// import '@/styles/globals.css';
// import { Toaster } from 'react-hot-toast';
// import { AppDialogProvider } from '@/components/Common/AppDialog';

// function MyApp({ Component, pageProps }: AppProps) {
//   useEffect(() => {
//     useAuthStore.getState().loadFromStorage();

//     if ('serviceWorker' in navigator) {
//       navigator.serviceWorker.getRegistrations().then((registrations) => {
//         registrations.forEach((registration) => registration.unregister());
//       });
//     }
//   }, []);

//   return (
//     <AppDialogProvider>
//       <Component {...pageProps} />
//       <Toaster position="top-right" />
//     </AppDialogProvider>
//   );
// }

// export default MyApp;

import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useAuthStore } from '@/store/authStore';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AppDialogProvider } from '@/components/Common/AppDialog';

function MyApp({ Component, pageProps }: AppProps) {
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

  return (
    <AppDialogProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </AppDialogProvider>
  );
}

export default MyApp;
