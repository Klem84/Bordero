'use client';

import { useActionState, useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { enregistrerExutoire, supprimerExutoire, type CamionState } from './actions';

export interface ExutoireRow {
  id: string;
  raison_sociale: string;
  type: string;
  adresse: string | null;
  siret: string | null;
  contact_responsable: string | null;
  tarif_depotage_m3_cents: number | null;
}

const TYPES = [
  { v: 'station_epuration', l: "Station d'épuration" },
  { v: 'centre_agree', l: 'Centre agréé' },
  { v: 'epandage_autorise', l: 'Épandage autorisé' },
  { v: 'autre', l: 'Autre' },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.v, t.l]));

function ExutoireForm({ exutoire, onDone }: { exutoire?: ExutoireRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<CamionState | null, FormData>(enregistrerExutoire, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);
  const uid = exutoire?.id ?? 'new';
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      {exutoire ? <input type="hidden" name="exutoire_id" value={exutoire.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Raison sociale" htmlFor={`r-${uid}`}>
          <Input id={`r-${uid}`} name="raison_sociale" required defaultValue={exutoire?.raison_sociale ?? ''} />
        </Field>
        <Field label="Type" htmlFor={`t-${uid}`}>
          <Select id={`t-${uid}`} name="type" defaultValue={exutoire?.type ?? 'station_epuration'}>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Adresse" htmlFor={`a-${uid}`}>
          <Input id={`a-${uid}`} name="adresse" defaultValue={exutoire?.adresse ?? ''} />
        </Field>
        <Field label="SIRET" htmlFor={`s-${uid}`}>
          <Input id={`s-${uid}`} name="siret" defaultValue={exutoire?.siret ?? ''} />
        </Field>
        <Field label="Contact responsable" htmlFor={`c-${uid}`}>
          <Input id={`c-${uid}`} name="contact" defaultValue={exutoire?.contact_responsable ?? ''} />
        </Field>
        <Field label="Tarif de dépotage (€/m³)" htmlFor={`tar-${uid}`}>
          <Input
            id={`tar-${uid}`}
            name="tarif_euros"
            type="number"
            min="0"
            step="0.5"
            defaultValue={exutoire?.tarif_depotage_m3_cents != null ? exutoire.tarif_depotage_m3_cents / 100 : ''}
          />
        </Field>
      </div>
      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enregistrement…' : exutoire ? 'Enregistrer' : "Ajouter l'exutoire"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function ExutoiresManager({ exutoires, isAdmin }: { exutoires: ExutoireRow[]; isAdmin: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Exutoires (filières d&apos;élimination)</h2>
        {isAdmin && !adding ? (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Ajouter un exutoire
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-4">
          <ExutoireForm onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <div className="space-y-3">
        {exutoires.length === 0 && !adding ? (
          <p className="text-sm text-ink-muted">
            Aucun exutoire. Ajoutez le lieu où vos camions dépotent (station d&apos;épuration, centre agréé…).
          </p>
        ) : (
          exutoires.map((e) =>
            editing === e.id ? (
              <ExutoireForm key={e.id} exutoire={e} onDone={() => setEditing(null)} />
            ) : (
              <Card key={e.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{e.raison_sociale}</span>
                    <Badge tone="neutral">{TYPE_LABEL[e.type] ?? e.type}</Badge>
                    {e.tarif_depotage_m3_cents != null ? (
                      <Badge tone="neutral">{(e.tarif_depotage_m3_cents / 100).toFixed(2)} €/m³</Badge>
                    ) : null}
                  </div>
                  {e.adresse ? <p className="mt-0.5 text-xs text-ink-muted">{e.adresse}</p> : null}
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(e.id)}
                      aria-label="Modifier l'exutoire"
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <form
                      action={supprimerExutoire}
                      onSubmit={(ev) => {
                        if (!window.confirm("Supprimer cet exutoire ?")) ev.preventDefault();
                      }}
                    >
                      <input type="hidden" name="exutoire_id" value={e.id} />
                      <button
                        type="submit"
                        aria-label="Supprimer l'exutoire"
                        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ) : null}
              </Card>
            ),
          )
        )}
      </div>
    </div>
  );
}
