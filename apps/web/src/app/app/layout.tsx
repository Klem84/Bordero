import { Droplets, LogOut } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser } from '@/lib/auth';
import { signOut } from '@/app/login/actions';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  exploitation: 'Exploitation',
  chauffeur: 'Chauffeur',
  comptable: 'Comptable',
  client: 'Client',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <Droplets className="h-6 w-6 text-white" strokeWidth={2.2} />
          <span className="text-lg font-semibold tracking-tight text-white">Bordero</span>
        </div>
        <Sidebar />
        <div className="mt-auto border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-ink">{user?.email ?? '—'}</p>
              <p className="text-xs text-sidebar-muted">
                {user?.role ? (ROLE_LABEL[user.role] ?? user.role) : ''}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-2 hover:text-sidebar-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
