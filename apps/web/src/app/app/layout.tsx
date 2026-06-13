import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  exploitation: 'Exploitation',
  chauffeur: 'Chauffeur',
  comptable: 'Comptable',
  client: 'Client',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const email = user?.email ?? '—';
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();
  const roleLabel = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : '';

  return (
    <AppShell email={email} roleLabel={roleLabel} initials={initials}>
      {children}
    </AppShell>
  );
}
