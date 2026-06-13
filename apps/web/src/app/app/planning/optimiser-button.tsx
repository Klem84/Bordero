'use client';

import { useActionState } from 'react';
import { Waypoints } from 'lucide-react';
import { optimiserTourneeAction, type OptimiseState } from './actions';

const initial: OptimiseState = { error: null };

/** Bouton « Optimiser l'ordre » avec retour du gain (Mapbox ou vol d'oiseau). */
export function OptimiserButton({ tourneeId }: { tourneeId: string }) {
  const [state, action, pending] = useActionState(optimiserTourneeAction, initial);
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="tournee_id" value={tourneeId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Optimiser l'ordre de passage"
        title="Optimiser l'ordre (trajet le plus court)"
        className="rounded-md p-1 text-ink-muted transition-colors hover:bg-brand-subtle hover:text-brand disabled:opacity-50"
      >
        <Waypoints className="h-4 w-4" />
      </button>
      {pending ? <span className="text-[11px] text-ink-muted">Calcul…</span> : null}
      {!pending && state?.phrase ? <span className="text-[11px] text-success">{state.phrase}</span> : null}
      {!pending && state?.error ? <span className="text-[11px] text-danger">{state.error}</span> : null}
    </form>
  );
}
