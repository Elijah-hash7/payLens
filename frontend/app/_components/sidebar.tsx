'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken } from '../_lib/api';

const NAV = [
  { 
    label: 'Overview', 
    href: '/dashboard',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    )
  },
  { 
    label: 'Dev Studio', 
    href: '/dev-studio',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    )
  },
  { 
    label: 'Recon Studio', 
    href: '/recon-studio',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('guest@paylens.local');

  useEffect(() => {
    // Attempt to parse token for email display
    const token = localStorage.getItem('paylens_token');
    if (token && token !== 'guest') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.email) setEmail(payload.email);
      } catch (err) {
        console.error(err);
      }
    } else if (token === 'guest') {
      setEmail('Guest Session');
    }
  }, []);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-gradient-to-b from-[#0a0f1d] to-[#04060c] border-r border-gray-900/60 relative z-30 select-none">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-gray-900 flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/20">
          <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">
          Pay<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Lens</span>
        </span>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                active
                  ? 'bg-blue-600/10 border border-blue-500/20 text-white shadow-lg shadow-blue-500/5'
                  : 'text-gray-400 hover:bg-gray-900/60 hover:text-white border border-transparent'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-blue-500 rounded-r" />
              )}
              <span className={`transition-colors duration-200 ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Session and Logout */}
      <div className="p-4 border-t border-gray-900 space-y-4">
        {/* User Card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900/30 border border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 uppercase">
            {email.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active User</p>
            <p className="text-xs font-semibold text-gray-300 truncate" title={email}>
              {email}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-transparent border border-gray-850 hover:border-red-900/30 hover:bg-red-950/15 py-2.5 text-xs font-semibold text-gray-400 hover:text-red-400 transition-all duration-200 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
