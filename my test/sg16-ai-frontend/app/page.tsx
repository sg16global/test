'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-sg16-dark relative overflow-hidden">
      {/* Cosmic background */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_50%,#00FF8830_0%,transparent_70%)] pointer-events-none" />
      
      <div className="text-center relative z-10">
        <div className="text-6xl font-black gradient-text mb-4 drop-shadow-[0_0_20px_rgba(0,255,136,0.8)]">
          SG16
        </div>
        <p className="text-sg16-cyan text-xl font-semibold mb-2">Most Powerful AI Engine</p>
        <p className="text-zinc-400 animate-pulse">Initializing...</p>
      </div>
    </div>
  );
}
