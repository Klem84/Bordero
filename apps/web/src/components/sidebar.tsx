'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/app', label: 'Tableau de bord' },
  { href: '/app/clients', label: 'Clients' },
  { href: '/app/interventions', label: 'Interventions' },
  { href: '/app/planning', label: 'Planning' },
  { href: '/app/conformite', label: 'Conformité' },
  { href: '/app/facturation', label: 'Facturation' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              'rounded-lg px-3 py-2 text-sm font-medium transition ' +
              (active ? 'bg-bordero text-white' : 'text-slate-600 hover:bg-slate-100')
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
