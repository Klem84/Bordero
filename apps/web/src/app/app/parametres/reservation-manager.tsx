'use client';

import { useActionState, useEffect, useState } from 'react';
import { Link2, Check, Copy } from 'lucide-react';
import { majReservation } from './actions';
import { Button } from '@/components/ui/button';
import { Label, Input } from '@/components/ui/input';
import type { CamionState } from './actions';

const initial: CamionState = { error: null };

export function ReservationManager({
  slug,
  active,
  isAdmin,
}: {
  slug: string | null;
  active: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(majReservation, initial);
  const [origin, setOrigin] = useState('');
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const lien = slug ? `${origin}/reserver/${slug}` : null;

  const copier = async () => {
    if (!lien) return;
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold text-ink">Page de réservation en ligne</h2>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        {slug ? (
          <div className="mb-5">
            <p className="text-xs text-ink-muted">Lien public à communiquer à vos clients</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-surface-2 px-2 py-1 font-mono text-sm text-ink">
                {lien ?? `…/reserver/${slug}`}
              </code>
              <button
                type="button"
                onClick={copier}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                {copie ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copie ? 'Copié' : 'Copier'}
              </button>
              {lien ? (
                <a
                  href={lien}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Ouvrir
                </a>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {active
                ? 'Les réservations en ligne sont ouvertes.'
                : 'Les réservations en ligne sont fermées (la page affiche un message).'}
            </p>
          </div>
        ) : null}

        {isAdmin ? (
          <form action={action} className="flex flex-col gap-4 border-t border-border pt-4">
            <div>
              <Label htmlFor="slug">Identifiant du lien</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">…/reserver/</span>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={slug ?? ''}
                  placeholder="mon-entreprise"
                  className="max-w-xs"
                />
              </div>
              <p className="mt-1 text-xs text-ink-muted">Lettres, chiffres et tirets uniquement.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="reservation_active"
                defaultChecked={active}
                className="h-4 w-4 accent-brand"
              />
              Accepter les réservations en ligne
            </label>
            {state?.error ? (
              <p role="alert" className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : null}
            {state?.ok ? (
              <p role="status" aria-live="polite" className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" /> Enregistré.
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="border-t border-border pt-4 text-sm text-ink-muted">
            Seul un administrateur peut modifier la page de réservation.
          </p>
        )}
      </div>
    </section>
  );
}
