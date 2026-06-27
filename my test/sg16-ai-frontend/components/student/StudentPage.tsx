'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function StudentPage() {
  const [studentEmail, setStudentEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.student.verify({
        student_email: studentEmail,
        full_name: fullName,
        school_name: schoolName,
      });
      setMessage('✓ Student verification submitted! Check back soon.');
      setStudentEmail('');
      setFullName('');
      setSchoolName('');
    } catch (err: any) {
      setMessage(err.detail || 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-10 h-10 text-sg16-green drop-shadow-[0_0_10px_rgba(0,255,136,0.6)]" />
          <h1 className="text-4xl font-black gradient-text">Student Mode</h1>
        </div>
        <p className="text-sg16-cyan text-lg font-semibold">
          Verify your student status for special pricing and features
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-sg16-card border-2 border-sg16-green/20 p-8 rounded-3xl space-y-5 glow-green-sm">
        <div>
          <label className="block text-sm text-sg16-cyan mb-2 font-semibold">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-sg16-dark border-2 border-sg16-green/30 rounded-2xl px-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-sg16-cyan mb-2 font-semibold">Student Email (.edu)</label>
          <input
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className="w-full bg-sg16-dark border-2 border-sg16-green/30 rounded-2xl px-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
            placeholder="you@university.edu"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-sg16-cyan mb-2 font-semibold">School/University Name</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full bg-sg16-dark border-2 border-sg16-green/30 rounded-2xl px-4 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
            required
          />
        </div>

        {message && (
          <p className={`font-semibold text-center py-2 rounded-xl ${
            message.startsWith('✓')
              ? 'text-sg16-green bg-sg16-green/10'
              : 'text-red-500 bg-red-500/10'
          }`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sg16-green hover:bg-sg16-green-glow text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition glow-green disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Student Status'}
          {!loading && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
