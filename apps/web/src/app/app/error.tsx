'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur écran:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-subtle text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Cet écran n&apos;a pas pu se charger. Vos données ne sont pas affectées. Réessayez ; si le
        problème persiste, rechargez la page.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-ink-muted">Référence : {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className={buttonClasses('primary', 'md')}>
          Réessayer
        </button>
        <a href="/app" className={buttonClasses('secondary', 'md')}>
          Tableau de bord
        </a>
      </div>
    </div>
  );
}
