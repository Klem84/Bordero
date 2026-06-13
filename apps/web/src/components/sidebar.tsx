'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Truck,
  CalendarDays,
  ShieldCheck,
  Receipt,
  RefreshCw,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/clients', label: 'Clients', icon: Users },
  { href: '/app/interventions', label: 'Interventions', icon: Truck },
  { href: '/app/planning', label: 'Planning', icon: CalendarDays },
  { href: '/app/recurrence', label: 'Récurrence', icon: RefreshCw },
  { href: '/app/conformite', label: 'Conformité', icon: ShieldCheck },
  { href: '/app/facturation', label: 'Facturation', icon: Receipt },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              active
                ? 'bg-brand text-white'
                : 'text-sidebar-muted hover:bg-sidebar-2 hover:text-sidebar-ink',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
