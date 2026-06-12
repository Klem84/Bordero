'use client';

import { useActionState } from 'react';
import { cloturerIntervention, type ClotureState } from '@/app/app/interventions/actions';

const initial: ClotureState = { error: null };

export function ClotureForm({ interventionId }: { interventionId: string }) {
  const [state, action, pending] = useActionState(cloturerIntervention, initial);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Bordereau <span className="font-semibold">{state.ok.numero}</span> émis et archivé (PDF). ✓
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="intervention_id" value={interventionId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-slate-500">Volume pompé (m³)</span>
        <input
          name="quantite"
          type="number"
          step="0.5"
          className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500 disabled:opacity-60"
      >
        {pending ? 'Clôture…' : 'Clôturer et générer le bordereau'}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
