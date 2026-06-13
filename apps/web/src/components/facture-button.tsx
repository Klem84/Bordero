'use client';

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { facturerIntervention, type FactureState } from '@/app/app/facturation/actions';
import { Button } from '@/components/ui/button';

const initial: FactureState = { error: null };

export function FactureButton({ interventionId }: { interventionId: string }) {
  const [state, action, pending] = useActionState(facturerIntervention, initial);

  if (state?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success-subtle px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Facture <span className="font-mono font-semibold">{state.ok.numero}</span> émise et archivée (PDF).
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="intervention_id" value={interventionId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Facturation…' : 'Générer la facture'}
      </Button>
      {state?.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
