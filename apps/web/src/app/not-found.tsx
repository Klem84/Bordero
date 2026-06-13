import Link from 'next/link';
import { Droplets } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="flex items-center gap-2 text-brand">
        <Droplets className="h-7 w-7" strokeWidth={2.2} />
        <span className="text-xl font-semibold tracking-tight">Bordero</span>
      </div>
      <p className="mt-8 font-mono text-5xl font-bold tabular text-ink">404</p>
      <h1 className="mt-3 text-lg font-semibold text-ink">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Cette page n&apos;existe pas ou a été déplacée. Revenez au tableau de bord pour reprendre.
      </p>
      <Link href="/app" className={buttonClasses('primary', 'md', 'mt-6')}>
        Retour au tableau de bord
      </Link>
    </div>
  );
}
