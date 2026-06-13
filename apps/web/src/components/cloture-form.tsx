'use client';

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cloturerIntervention, type ClotureState } from '@/app/app/interventions/actions';
import { Button } from '@/components/ui/button';

const initial: ClotureState = { error: null };

export function ClotureForm({ interventionId }: { interventionId: string }) {
  const [state, action, pending] = useActionState(cloturerIntervention, initial);

  if (state?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success-subtle px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Bordereau <span className="font-mono font-semibold">{state.ok.numero}</span> émis et archivé (PDF).
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="intervention_id" value={interventionId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-ink-muted">Volume pompé (m³)</span>
        <input
          name="quantite"
          type="number"
          step="0.5"
          className="h-9 w-32 rounded-lg border border-border bg-surface px-2 text-sm tabular text-ink outline-none focus-visible:shadow-ring"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Clôture…' : 'Clôturer et générer le bordereau'}
      </Button>
      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
