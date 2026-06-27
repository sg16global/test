'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.auth.register({ email, password, full_name: fullName });
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.detail || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sg16-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cosmic background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_50%,#00FF8820_0%,transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black gradient-text mb-2 drop-shadow-[0_0_10px_rgba(0,255,136,0.8)]">
            SG16
          </h1>
          <p className="text-sg16-cyan font-semibold text-lg">Create Your Account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-sg16-cyan mb-2 font-semibold">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-4 w-5 h-5 text-sg16-green" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-sg16-card border-2 border-sg16-green/30 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-sg16-cyan mb-2 font-semibold">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-sg16-green" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-sg16-card border-2 border-sg16-green/30 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-sg16-cyan mb-2 font-semibold">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-sg16-green" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-sg16-card border-2 border-sg16-green/30 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sg16-green hover:bg-sg16-green-glow text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition glow-green disabled:opacity-50 disabled:glow-green-sm"
          >
            {loading ? 'Creating...' : 'Create Account'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <p className="text-center text-zinc-400 mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-sg16-green hover:text-sg16-green-glow font-semibold transition">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
