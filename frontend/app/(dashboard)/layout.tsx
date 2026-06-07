import { AuthGuard } from '../_components/auth-guard';
import { Sidebar } from '../_components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
