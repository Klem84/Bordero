'use client';

import { useActionState, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { statutEcheance } from '@bordero/core';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { enregistrerAgrement, supprimerAgrement, type CamionState } from './actions';

export interface AgrementRow {
  id: string;
  departement_code: string;
  departement_libelle: string | null;
  numero: string;
  date_delivrance: string;
  date_echeance: string;
  quantite_max_annuelle_m3: number | null;
  statut: string;
}

const STATUTS = [
  { v: 'actif', l: 'Actif', tone: 'success' as Tone },
  { v: 'en_renouvellement', l: 'En renouvellement', tone: 'warning' as Tone },
  { v: 'expire', l: 'Expiré', tone: 'danger' as Tone },
  { v: 'suspendu', l: 'Suspendu', tone: 'danger' as Tone },
];
const STATUT_MAP = Object.fromEntries(STATUTS.map((s) => [s.v, s]));

function AgrementForm({ agrement, onDone }: { agrement?: AgrementRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<CamionState | null, FormData>(enregistrerAgrement, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);
  const uid = agrement?.id ?? 'new';
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
      {agrement ? <input type="hidden" name="agrement_id" value={agrement.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Numéro d'agrément" htmlFor={`n-${uid}`}>
          <Input id={`n-${uid}`} name="numero" required defaultValue={agrement?.numero ?? ''} placeholder="AG-12-001" />
        </Field>
        <Field label="Statut" htmlFor={`st-${uid}`}>
          <Select id={`st-${uid}`} name="statut" defaultValue={agrement?.statut ?? 'actif'}>
            {STATUTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Code département" htmlFor={`d-${uid}`}>
          <Input id={`d-${uid}`} name="departement_code" required defaultValue={agrement?.departement_code ?? ''} placeholder="12" />
        </Field>
        <Field label="Département" htmlFor={`dl-${uid}`}>
          <Input id={`dl-${uid}`} name="departement_libelle" defaultValue={agrement?.departement_libelle ?? ''} placeholder="Aveyron" />
        </Field>
        <Field label="Délivrance" htmlFor={`dd-${uid}`}>
          <Input id={`dd-${uid}`} name="date_delivrance" type="date" required defaultValue={agrement?.date_delivrance ?? ''} />
        </Field>
        <Field label="Échéance" htmlFor={`de-${uid}`}>
          <Input id={`de-${uid}`} name="date_echeance" type="date" required defaultValue={agrement?.date_echeance ?? ''} />
        </Field>
        <Field label="Quota annuel (m³)" htmlFor={`q-${uid}`}>
          <Input id={`q-${uid}`} name="quota" type="number" min="0" defaultValue={agrement?.quantite_max_annuelle_m3 ?? ''} />
        </Field>
      </div>
      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Enregistrement…' : agrement ? 'Enregistrer' : "Ajouter l'agrément"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function AgrementsManager({ agrements, isAdmin }: { agrements: AgrementRow[]; isAdmin: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Agréments préfectoraux</h2>
        {isAdmin && !adding ? (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Ajouter un agrément
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-4">
          <AgrementForm onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <div className="space-y-3">
        {agrements.length === 0 && !adding ? (
          <p className="text-sm text-ink-muted">
            Aucun agrément. Renseignez votre autorisation préfectorale pour activer le suivi de quota et le bilan annuel.
          </p>
        ) : (
          agrements.map((a) => {
            const ech = statutEcheance(a.date_echeance, today);
            return editing === a.id ? (
              <AgrementForm key={a.id} agrement={a} onDone={() => setEditing(null)} />
            ) : (
              <Card key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-ink">{a.numero}</span>
                    <span className="text-sm text-ink-muted">
                      Dépt {a.departement_code}
                      {a.departement_libelle ? ` · ${a.departement_libelle}` : ''}
                    </span>
                    <Badge tone={STATUT_MAP[a.statut]?.tone ?? 'neutral'}>
                      {STATUT_MAP[a.statut]?.l ?? a.statut}
                    </Badge>
                    {a.quantite_max_annuelle_m3 != null ? (
                      <Badge tone="neutral">{a.quantite_max_annuelle_m3} m³/an</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Échéance {new Date(a.date_echeance).toLocaleDateString('fr-FR')}
                    {ech === 'depassee' ? ' (dépassée)' : ech === 'proche' ? ' (bientôt)' : ''}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(a.id)}
                      aria-label="Modifier l'agrément"
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <form
                      action={supprimerAgrement}
                      onSubmit={(ev) => {
                        if (!window.confirm("Supprimer cet agrément ?")) ev.preventDefault();
                      }}
                    >
                      <input type="hidden" name="agrement_id" value={a.id} />
                      <button
                        type="submit"
                        aria-label="Supprimer l'agrément"
                        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
