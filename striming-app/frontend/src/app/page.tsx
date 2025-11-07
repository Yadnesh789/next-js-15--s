'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import VideoList from '@/components/VideoList';
import Navbar from '@/components/Navbar';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Temporarily comment out authentication check for debugging
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     router.push('/login');
  //   }
  // }, [isAuthenticated, router]);

  // if (!isAuthenticated) {
  //   return null;
  // }

  return (
    <main style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Navbar />
      <VideoList />
    </main>
  );
}

