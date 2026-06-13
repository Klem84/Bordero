'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { appliquerTVACents, calculerPrixLigneCents } from '@bordero/core';
import { createClient } from '@/lib/supabase/client';
import { creerCommande, type CommandeState } from '@/app/app/commandes/actions';
import { Button } from '@/components/ui/button';

export interface PrestationDTO {
  id: string;
  libelle: string;
  prix_base_cents: number;
  majoration_urgence_pct: number;
  majoration_weekend_pct: number;
  volume_forfait_m3: number | null;
  prix_m3_supplementaire_cents: number | null;
  tva_taux: number;
}
interface ClientLite {
  id: string;
  nom: string;
}
interface SiteLite {
  id: string;
  adresse: string;
}
interface OuvrageLite {
  id: string;
  type: string;
}

const num = (v: unknown) => Number(v ?? 0);
const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const initial: CommandeState = { error: null };

export function PriseCommandeForm({
  clients,
  prestations,
  initialClientId,
}: {
  clients: ClientLite[];
  prestations: PrestationDTO[];
  initialClientId: string | null;
}) {
  const [state, action, pending] = useActionState(creerCommande, initial);
  const [clientId, setClientId] = useState(initialClientId ?? '');
  const [sites, setSites] = useState<SiteLite[]>([]);
  const [siteId, setSiteId] = useState('');
  const [ouvrages, setOuvrages] = useState<OuvrageLite[]>([]);
  const [ouvrageId, setOuvrageId] = useState('');
  const [prestationId, setPrestationId] = useState(prestations[0]?.id ?? '');
  const [urgence, setUrgence] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [volume, setVolume] = useState('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!clientId) {
      setSites([]);
      return;
    }
    supabase
      .from('sites')
      .select('id, adresse')
      .eq('client_id', clientId)
      .then(({ data }) => {
        const rows = (data ?? []) as SiteLite[];
        setSites(rows);
        setSiteId(rows[0]?.id ?? '');
      });
  }, [clientId, supabase]);

  useEffect(() => {
    if (!siteId) {
      setOuvrages([]);
      return;
    }
    supabase
      .from('ouvrages')
      .select('id, type')
      .eq('site_id', siteId)
      .then(({ data }) => {
        const rows = (data ?? []) as OuvrageLite[];
        setOuvrages(rows);
        setOuvrageId(rows[0]?.id ?? '');
      });
  }, [siteId, supabase]);

  const presta = prestations.find((p) => p.id === prestationId);
  const prixHt = presta
    ? calculerPrixLigneCents(
        {
          prixBaseCents: num(presta.prix_base_cents),
          majorationUrgencePct: num(presta.majoration_urgence_pct),
          majorationWeekendPct: num(presta.majoration_weekend_pct),
          volumeForfaitM3: presta.volume_forfait_m3 == null ? undefined : num(presta.volume_forfait_m3),
          prixM3SupplementaireCents:
            presta.prix_m3_supplementaire_cents == null
              ? undefined
              : num(presta.prix_m3_supplementaire_cents),
        },
        { urgence, weekend, volumeReelM3: volume ? Number(volume) : undefined },
      )
    : 0;
  const { tvaCents, ttcCents } = appliquerTVACents(prixHt, presta ? num(presta.tva_taux) : 20);

  const label = 'mb-1.5 block text-sm font-medium text-ink';
  const field =
    'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-shadow focus-visible:shadow-ring focus-visible:border-brand';

  return (
    <form action={action} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-card">
      <div>
        <label className={label}>Client</label>
        <select
          name="client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className={field}
        >
          <option value="">Sélectionner un client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Site</label>
          <select name="site_id" value={siteId} onChange={(e) => setSiteId(e.target.value)} required className={field}>
            {sites.length === 0 ? <option value="">—</option> : null}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.adresse}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Ouvrage</label>
          <select name="ouvrage_id" value={ouvrageId} onChange={(e) => setOuvrageId(e.target.value)} className={field}>
            <option value="">(aucun)</option>
            {ouvrages.map((o) => (
              <option key={o.id} value={o.id}>
                {o.type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Prestation</label>
        <select
          name="prestation_id"
          value={prestationId}
          onChange={(e) => setPrestationId(e.target.value)}
          required
          className={field}
        >
          {prestations.map((p) => (
            <option key={p.id} value={p.id}>
              {p.libelle} — {euros(num(p.prix_base_cents))}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="urgence" checked={urgence} onChange={(e) => setUrgence(e.target.checked)} />
          Urgence
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="weekend" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} />
          Week-end
        </label>
        <label className="flex items-center gap-2 text-sm">
          Volume estimé (m³)
          <input
            type="number"
            name="volume"
            step="0.5"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Date prévue</label>
          <input type="date" name="date_prevue" className={field} />
        </div>
        <div>
          <label className={label}>Créneau</label>
          <select name="fenetre" className={field} defaultValue="">
            <option value="">—</option>
            <option value="matin">Matin (8h-12h)</option>
            <option value="apres_midi">Après-midi (13h-17h)</option>
            <option value="precis">Horaire précis</option>
          </select>
        </div>
      </div>

      {/* Récapitulatif prix en direct */}
      <div className="rounded-lg bg-brand-subtle p-4 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Total HT</span>
          <span className="tabular font-medium text-ink">{euros(prixHt)}</span>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>TVA</span>
          <span className="tabular">{euros(tvaCents)}</span>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-brand/15 pt-1.5 text-base font-semibold text-brand-ink">
          <span>Total TTC</span>
          <span className="tabular">{euros(ttcCents)}</span>
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending || !clientId || !siteId}>
        {pending ? 'Création…' : 'Valider la commande'}
      </Button>
    </form>
  );
}
