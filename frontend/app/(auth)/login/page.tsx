'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveToken } from '../../_lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', {
        email,
        password,
      });
      saveToken(accessToken);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030303] px-4 overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 mb-4">
            <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Pay<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Lens</span>
          </h1>
          <p className="mt-2 text-xs text-gray-400 font-medium">AI-powered payment testing and reconciliation</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/5 bg-gray-900/40 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/30 border border-red-900/40 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  saveToken('guest');
                  router.replace('/dashboard');
                }}
                className="w-full rounded-xl border border-gray-850 hover:border-gray-750 bg-gray-900/40 hover:bg-gray-800/60 py-3 text-sm font-semibold text-gray-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                Continue as Guest
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          New to PayLens?{' '}
          <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
