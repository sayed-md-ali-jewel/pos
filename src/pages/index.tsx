import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isInitialized) return;

    if (auth.isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [auth.isInitialized, auth.isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    </div>
  );
}
