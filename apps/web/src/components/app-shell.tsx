'use client';

import { useEffect, useState } from 'react';
import { Droplets, LogOut, Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { signOut } from '@/app/login/actions';

function SidebarPanel({
  email,
  roleLabel,
  initials,
  onNavigate,
}: {
  email: string;
  roleLabel: string;
  initials: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <Droplets className="h-6 w-6 text-white" strokeWidth={2.2} />
        <span className="text-lg font-semibold tracking-tight text-white">Bordero</span>
      </div>
      <Sidebar onNavigate={onNavigate} />
      <div className="mt-auto border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-ink">{email}</p>
            <p className="text-xs text-sidebar-muted">{roleLabel}</p>
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
    </div>
  );
}

export function AppShell({
  email,
  roleLabel,
  initials,
  children,
}: {
  email: string;
  roleLabel: string;
  initials: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixe (lg et plus) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <SidebarPanel email={email} roleLabel={roleLabel} initials={initials} />
      </aside>

      {/* Drawer mobile (sous lg) */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out-quart ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={`absolute left-0 top-0 h-full w-64 shadow-card-hover transition-transform duration-200 ease-out-quart ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarPanel
            email={email}
            roleLabel={roleLabel}
            initials={initials}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-brand" strokeWidth={2.2} />
            <span className="font-semibold tracking-tight text-ink">Bordero</span>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[1100px]">{children}</div>
        </main>
      </div>

      {/* Bouton de fermeture flottant quand le drawer est ouvert */}
      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
          className="fixed right-4 top-3 z-50 rounded-lg p-1.5 text-white lg:hidden"
        >
          <X className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
