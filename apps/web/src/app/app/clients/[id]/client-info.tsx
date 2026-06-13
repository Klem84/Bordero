'use client';

import { useActionState, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { CLIENT_TYPE } from '@/lib/statuts';
import { modifierClient, type CrudState } from '../actions';

export interface ClientInfoData {
  id: string;
  type: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  siret: string | null;
}

const TYPES = Object.entries(CLIENT_TYPE).map(([v, l]) => ({ v, l }));

function InfoCard({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={'mt-1 text-sm font-medium text-ink' + (mono ? ' font-mono' : '')}>{value ?? '—'}</p>
    </Card>
  );
}

export function ClientInfo({ client, nbSites }: { client: ClientInfoData; nbSites: number }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CrudState | null, FormData>(modifierClient, null);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state?.ok]);

  if (editing) {
    return (
      <form action={action} className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <input type="hidden" name="client_id" value={client.id} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" defaultValue={client.type}>
              {TYPES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nom" htmlFor="nom">
            <Input id="nom" name="nom" required defaultValue={client.nom} />
          </Field>
          <Field label="Téléphone" htmlFor="telephone">
            <Input id="telephone" name="telephone" type="tel" defaultValue={client.telephone ?? ''} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
          </Field>
          <Field label="SIRET" htmlFor="siret">
            <Input id="siret" name="siret" inputMode="numeric" defaultValue={client.siret ?? ''} />
          </Field>
        </div>
        {state?.error ? (
          <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> Modifier la fiche
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="Téléphone" value={client.telephone} mono />
        <InfoCard label="Email" value={client.email} />
        {client.siret ? (
          <InfoCard label="SIRET" value={client.siret} mono />
        ) : (
          <InfoCard label="Sites" value={String(nbSites)} />
        )}
      </div>
    </div>
  );
}
