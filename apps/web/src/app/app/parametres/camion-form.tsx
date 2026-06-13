'use client';

import { useActionState, useEffect } from 'react';
import { creerCamion, modifierCamion, type CamionState } from './actions';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';

export interface CamionData {
  id: string;
  immatriculation: string;
  type: string;
  capacite_citerne_m3: number;
  controle_technique_echeance: string | null;
  adr_validite: string | null;
}

const TYPES = [
  { v: 'hydrocureur', l: 'Hydrocureur' },
  { v: 'combine', l: 'Combiné' },
  { v: 'citerne_simple', l: 'Citerne simple' },
  { v: 'fourgon', l: 'Fourgon' },
];

export function CamionForm({ camion, onDone }: { camion?: CamionData; onDone: () => void }) {
  const [state, action, pending] = useActionState<CamionState | null, FormData>(
    camion ? modifierCamion : creerCamion,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  const uid = camion?.id ?? 'new';
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      {camion ? <input type="hidden" name="camion_id" value={camion.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Immatriculation" htmlFor={`immat-${uid}`}>
          <Input
            id={`immat-${uid}`}
            name="immatriculation"
            required
            defaultValue={camion?.immatriculation ?? ''}
            placeholder="AV-742-RZ"
          />
        </Field>
        <Field label="Type" htmlFor={`type-${uid}`}>
          <Select id={`type-${uid}`} name="type" defaultValue={camion?.type ?? 'hydrocureur'}>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacité de citerne (m³)" htmlFor={`cap-${uid}`}>
          <Input
            id={`cap-${uid}`}
            name="capacite"
            type="number"
            min="0"
            step="0.5"
            required
            defaultValue={camion?.capacite_citerne_m3 ?? ''}
          />
        </Field>
        <div />
        <Field label="Contrôle technique (échéance)" htmlFor={`ct-${uid}`}>
          <Input id={`ct-${uid}`} name="ct" type="date" defaultValue={camion?.controle_technique_echeance ?? ''} />
        </Field>
        <Field label="Validité ADR" htmlFor={`adr-${uid}`}>
          <Input id={`adr-${uid}`} name="adr" type="date" defaultValue={camion?.adr_validite ?? ''} />
        </Field>
      </div>
      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enregistrement…' : camion ? 'Enregistrer' : 'Ajouter le camion'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
