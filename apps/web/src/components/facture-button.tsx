'use client';

import { useActionState } from 'react';
import { facturerIntervention, type FactureState } from '@/app/app/facturation/actions';

const initial: FactureState = { error: null };

export function FactureButton({ interventionId }: { interventionId: string }) {
  const [state, action, pending] = useActionState(facturerIntervention, initial);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Facture <span className="font-semibold">{state.ok.numero}</span> émise et archivée (PDF). ✓
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="intervention_id" value={interventionId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-bordero px-4 py-2 text-sm font-medium text-bordero hover:bg-bordero-50 disabled:opacity-60"
      >
        {pending ? 'Facturation…' : 'Générer la facture'}
      </button>
      {state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
