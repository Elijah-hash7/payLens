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
  const [isCollapsed, setIsCollapsed] = useState(false);

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

    // Load collapse state
    const collapsed = localStorage.getItem('paylens_sidebar_collapsed') === 'true';
    setIsCollapsed(collapsed);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('paylens_sidebar_collapsed', String(nextState));
  };

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <aside className={`flex h-screen flex-col bg-gradient-to-b from-[#0a0f1d] to-[#04060c] border-r border-gray-900/60 relative z-30 select-none transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className={`px-5 py-6 border-b border-gray-900 flex items-center justify-between ${isCollapsed ? 'flex-col gap-4' : ''}`}>
        {!isCollapsed ? (
          <span className="text-white font-bold text-lg tracking-tight">
            Pay<span className="text-blue-500">Lens</span>
          </span>
        ) : (
          <span className="text-blue-500 font-bold text-lg tracking-tight select-none">
            PL
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="text-gray-500 hover:text-white transition-colors cursor-pointer focus:outline-none"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'
              } ${
                active
                  ? 'bg-blue-600/10 border border-blue-500/20 text-white shadow-lg shadow-blue-500/5'
                  : 'text-gray-400 hover:bg-gray-900/60 hover:text-white border border-transparent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-blue-500 rounded-r" />
              )}
              <span className={`transition-colors duration-200 shrink-0 ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {item.icon}
              </span>
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Session and Logout */}
      <div className={`p-4 border-t border-gray-900 space-y-4 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {/* User Card */}
        <div className={`flex items-center rounded-xl bg-gray-900/30 border border-white/5 ${isCollapsed ? 'p-2 justify-center' : 'gap-3 px-3 py-2.5'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 uppercase shrink-0">
            {email.substring(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active User</p>
              <p className="text-xs font-semibold text-gray-300 truncate" title={email}>
                {email}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`flex items-center justify-center rounded-xl bg-transparent border border-gray-850 hover:border-red-900/30 hover:bg-red-950/15 text-xs font-semibold text-gray-400 hover:text-red-400 transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'h-10 w-10 p-0 border-none' : 'w-full gap-2 py-2.5'
          }`}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
