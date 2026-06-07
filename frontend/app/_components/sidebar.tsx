'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '../_lib/api';

const NAV = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Dev Studio', href: '/dev-studio' },
  { label: 'Recon Studio', href: '/recon-studio' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-800">
        <span className="text-white font-semibold text-lg tracking-tight">
          Pay<span className="text-blue-400">Lens</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
