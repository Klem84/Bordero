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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <span className="text-xl font-bold tracking-tight text-bordero">Bordero</span>
        </div>
        <Sidebar />
        <div className="mt-auto border-t border-slate-200 p-3 text-sm">
          <p className="truncate font-medium text-slate-700">{user?.email ?? '—'}</p>
          <p className="text-xs text-slate-500">{user?.role ? ROLE_LABEL[user.role] ?? user.role : ''}</p>
          <form action={signOut}>
            <button type="submit" className="mt-2 text-xs text-slate-500 underline hover:text-slate-700">
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
