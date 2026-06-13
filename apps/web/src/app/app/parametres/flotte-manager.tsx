'use client';

import { useState } from 'react';
import { Truck, Plus, Pencil } from 'lucide-react';
import { statutEcheance } from '@bordero/core';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CamionForm, type CamionData } from './camion-form';
import { basculerActifCamion } from './actions';

export interface CamionRow extends CamionData {
  actif: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  hydrocureur: 'Hydrocureur',
  combine: 'Combiné',
  citerne_simple: 'Citerne simple',
  fourgon: 'Fourgon',
};

function echeanceBadge(dateIso: string | null, today: string, label: string) {
  const s = statutEcheance(dateIso, today);
  if (s === 'inconnue') return null;
  const tone: Tone = s === 'depassee' ? 'danger' : s === 'proche' ? 'warning' : 'neutral';
  const suffix = dateIso ? new Date(dateIso).toLocaleDateString('fr-FR') : '';
  return (
    <Badge tone={tone}>
      {label} {s === 'depassee' ? 'expiré' : suffix}
    </Badge>
  );
}

export function FlotteManager({
  camions,
  isAdmin,
}: {
  camions: CamionRow[];
  isAdmin: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Parc de camions</h2>
        {isAdmin && !adding ? (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Ajouter un camion
          </Button>
        ) : null}
      </div>

      {!isAdmin ? (
        <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-muted">
          La gestion du parc est réservée aux administrateurs.
        </p>
      ) : null}

      {adding ? (
        <div className="mb-4">
          <CamionForm onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <div className="space-y-3">
        {camions.length === 0 && !adding ? (
          <p className="text-sm text-ink-muted">
            Aucun camion. Ajoutez votre premier véhicule pour pouvoir planifier les tournées.
          </p>
        ) : (
          camions.map((c) =>
            editing === c.id ? (
              <CamionForm key={c.id} camion={c} onDone={() => setEditing(null)} />
            ) : (
              <Card key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                  <Truck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-ink">{c.immatriculation}</span>
                    <span className="text-sm text-ink-muted">{TYPE_LABEL[c.type] ?? c.type}</span>
                    <Badge tone="neutral">{c.capacite_citerne_m3} m³</Badge>
                    {!c.actif ? <Badge tone="warning">Inactif</Badge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {echeanceBadge(c.controle_technique_echeance, today, 'CT')}
                    {echeanceBadge(c.adr_validite, today, 'ADR')}
                  </div>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(c.id)}
                      aria-label="Modifier le camion"
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <form action={basculerActifCamion}>
                      <input type="hidden" name="camion_id" value={c.id} />
                      <input type="hidden" name="actif" value={String(c.actif)} />
                      <Button type="submit" variant="secondary" size="sm">
                        {c.actif ? 'Désactiver' : 'Activer'}
                      </Button>
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
