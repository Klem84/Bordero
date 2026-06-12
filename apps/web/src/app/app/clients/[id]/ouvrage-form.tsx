'use client';

import { useActionState, useEffect, useState } from 'react';
import { OUVRAGE_TYPES, PERIODICITE_DEFAUT_MOIS, type OuvrageType } from '@bordero/core';
import { creerOuvrage, modifierOuvrage, type CrudState } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { OUVRAGE_TYPE } from '@/lib/statuts';

export interface OuvrageData {
  id: string;
  type: string;
  volume_nominal_litres: number | null;
  periodicite_mois: number | null;
  date_derniere_intervention: string | null;
  localisation: string | null;
  /** Calculé côté serveur (A4) ; affiché en lecture, non éditable. */
  date_prochaine_echeance?: string | null;
}

export function OuvrageForm({
  clientId,
  siteId,
  ouvrage,
  onDone,
}: {
  clientId: string;
  siteId: string;
  ouvrage?: OuvrageData;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<CrudState | null, FormData>(
    ouvrage ? modifierOuvrage : creerOuvrage,
    null,
  );
  const initialType = (ouvrage?.type as OuvrageType) ?? 'FOSSE_TOUTES_EAUX';
  const [type, setType] = useState<OuvrageType>(initialType);
  const [periodicite, setPeriodicite] = useState<string>(
    ouvrage?.periodicite_mois != null
      ? String(ouvrage.periodicite_mois)
      : String(PERIODICITE_DEFAUT_MOIS[initialType] ?? ''),
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  const uid = ouvrage?.id ?? 'new';

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="site_id" value={siteId} />
      {ouvrage ? <input type="hidden" name="ouvrage_id" value={ouvrage.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type d'ouvrage" htmlFor={`type-${uid}`}>
          <Select
            id={`type-${uid}`}
            name="type"
            value={type}
            onChange={(e) => {
              const t = e.target.value as OuvrageType;
              setType(t);
              const def = PERIODICITE_DEFAUT_MOIS[t];
              setPeriodicite(def != null ? String(def) : '');
            }}
          >
            {OUVRAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {OUVRAGE_TYPE[t] ?? t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Volume nominal (litres)" htmlFor={`vol-${uid}`}>
          <Input
            id={`vol-${uid}`}
            name="volume"
            type="number"
            min="0"
            defaultValue={ouvrage?.volume_nominal_litres ?? ''}
          />
        </Field>
        <Field label="Périodicité d'entretien (mois)" htmlFor={`per-${uid}`}>
          <Input
            id={`per-${uid}`}
            name="periodicite_mois"
            type="number"
            min="0"
            value={periodicite}
            onChange={(e) => setPeriodicite(e.target.value)}
          />
        </Field>
        <Field label="Dernière intervention" htmlFor={`dd-${uid}`}>
          <Input
            id={`dd-${uid}`}
            name="date_derniere"
            type="date"
            defaultValue={ouvrage?.date_derniere_intervention ?? ''}
          />
        </Field>
      </div>
      <Field label="Localisation / repère" htmlFor={`loc-${uid}`} hint="Ex. : fosse au fond du jardin côté est.">
        <Input id={`loc-${uid}`} name="localisation" defaultValue={ouvrage?.localisation ?? ''} />
      </Field>
      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enregistrement…' : ouvrage ? 'Enregistrer' : 'Ajouter l’ouvrage'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
