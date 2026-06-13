'use client';

import { useActionState } from 'react';
import { affecterIntervention, type PlanningState } from './actions';
import { buttonClasses } from '@/components/ui/button';

export function AffecterForm({
  interventionId,
  date,
  camions,
}: {
  interventionId: string;
  date: string;
  camions: { id: string; immatriculation: string }[];
}) {
  const [state, action, pending] = useActionState<PlanningState | null, FormData>(
    affecterIntervention,
    null,
  );

  return (
    <form action={action} className="mt-2 flex items-center gap-1.5">
      <input type="hidden" name="intervention_id" value={interventionId} />
      <input type="hidden" name="date" value={date} />
      <select
        name="camion_id"
        defaultValue={camions[0]?.id ?? ''}
        aria-label="Affecter à un camion"
        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-[13px] text-ink outline-none focus-visible:shadow-ring"
      >
        {camions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.immatriculation}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={buttonClasses('secondary', 'sm')}>
        Affecter
      </button>
      {state?.error ? (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
