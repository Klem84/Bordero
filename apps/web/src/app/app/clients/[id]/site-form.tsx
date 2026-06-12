'use client';

import { useActionState, useEffect } from 'react';
import { creerSite, modifierSite, type CrudState } from '../actions';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export interface SiteData {
  id: string;
  adresse: string;
  instructions_acces: string | null;
}

export function SiteForm({
  clientId,
  site,
  onDone,
}: {
  clientId: string;
  site?: SiteData;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<CrudState | null, FormData>(
    site ? modifierSite : creerSite,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      <input type="hidden" name="client_id" value={clientId} />
      {site ? <input type="hidden" name="site_id" value={site.id} /> : null}
      <AddressAutocomplete
        id={`adresse-${site?.id ?? 'new'}`}
        defaultValue={site?.adresse ?? ''}
        required
      />
      <Field label="Instructions d'accès" htmlFor={`ia-${site?.id ?? 'new'}`} hint="Code portail, emplacement de la fosse, contact sur place…">
        <Input
          id={`ia-${site?.id ?? 'new'}`}
          name="instructions_acces"
          defaultValue={site?.instructions_acces ?? ''}
        />
      </Field>
      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enregistrement…' : site ? 'Enregistrer' : 'Ajouter le site'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
