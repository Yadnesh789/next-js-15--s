'use client';

import Navbar from '@/components/Navbar';
import VideoSearch from '@/components/VideoSearch';

export default function SearchPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <VideoSearch />
    </main>
  );
}
