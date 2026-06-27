'use client';

import { useAuth } from '@/hooks/useAuth';
import ChatInterface from '@/components/chat/ChatInterface';
import { Menu, LogOut, MessageCircle, GraduationCap, Settings } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function DashboardLayout() {
  const { user, logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sg16-dark">
        <div className="text-center">
          <p className="text-sg16-green text-xl font-bold animate-pulse">Loading SG16...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sg16-dark text-white flex">
      {/* Sidebar */}
      <div
        className={`w-64 border-r border-sg16-green/10 p-6 hidden md:flex flex-col bg-sg16-card/30 transition-all duration-300 ${
          sidebarOpen ? 'fixed left-0 top-0 z-50' : ''
        }`}
      >
        <div className="mb-8">
          <h2 className="text-3xl font-black gradient-text drop-shadow-[0_0_10px_rgba(0,255,136,0.6)]">
            SG16
          </h2>
        </div>
        <nav className="space-y-3 flex-1">
          <Link
            href="/dashboard/chat"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-sg16-green/10 transition border border-transparent hover:border-sg16-green/30"
          >
            <MessageCircle className="w-5 h-5 text-sg16-green" />
            <span className="font-semibold">AI Chat</span>
          </Link>
          <Link
            href="/dashboard/student"
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-sg16-green/10 transition border border-transparent hover:border-sg16-green/30"
          >
            <GraduationCap className="w-5 h-5 text-sg16-cyan" />
            <span className="font-semibold">Student Mode</span>
          </Link>
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 transition border border-transparent hover:border-red-500/30 w-full text-red-500 font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Nav */}
        <div className="border-b border-sg16-green/10 p-4 flex items-center justify-between bg-sg16-card/30 backdrop-blur-sm">
          <button
            className="md:hidden text-sg16-green"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-sg16-cyan font-semibold">{user.sub}</span>
                <button
                  onClick={logout}
                  className="text-red-500 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-500/10"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-auto">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
