import type { InterventionState } from '@bordero/core';
import { supabase } from './supabase';
import {
  upsertInterventions,
  getEvenementsEnAttente,
  marquerSynchronise,
  type LocalIntervention,
} from './db';

/**
 * Synchronisation offline-first (algorithme A2).
 * - push : envoie les transitions terrain en attente (idempotent côté serveur).
 * - pull : rafraîchit le cache des interventions du jour (planification serveur).
 * Le serveur est la source de vérité de la PLANIFICATION ; le terminal celle de
 * l'EXÉCUTION. Les conflits sont arbitrés côté serveur.
 */
interface PlanningViewRow {
  id: string;
  status: InterventionState;
  date_prevue: string | null;
  urgence: boolean | null;
  ordre_passage: number | null;
  client_nom: string | null;
  site_adresse: string | null;
  fenetre: string | null;
}

export async function pousserEnAttente(): Promise<{ envoyes: number; echecs: number }> {
  const pending = await getEvenementsEnAttente();
  const ok: string[] = [];
  let echecs = 0;
  for (const ev of pending) {
    let error: { message: string } | null = null;
    if (ev.type === 'releve') {
      const p = JSON.parse(ev.payload || '{}') as {
        ouvrage_id: string | null;
        volume_m3: number | null;
        observations: string | null;
        prochaine_date: string | null;
      };
      ({ error } = await supabase.rpc('rpc_sync_releve', {
        p_intervention_id: ev.intervention_id,
        p_ouvrage_id: p.ouvrage_id,
        p_volume_m3: p.volume_m3,
        p_observations: p.observations,
        p_prochaine_date: p.prochaine_date,
        p_client_event_uuid: ev.client_event_uuid,
      } as never));
    } else {
      ({ error } = await supabase.rpc('rpc_sync_evenement', {
        p_intervention_id: ev.intervention_id,
        p_client_event_uuid: ev.client_event_uuid,
        p_status_to: ev.status_to,
        p_payload: JSON.parse(ev.payload || '{}'),
      } as never));
    }
    if (error) {
      echecs += 1;
    } else {
      ok.push(ev.client_event_uuid);
    }
  }
  await marquerSynchronise(ok);
  return { envoyes: ok.length, echecs };
}

export async function tirerInterventionsDuJour(dateIso: string): Promise<number> {
  const { data, error } = await supabase
    .from('v_planning_interventions')
    .select('id, status, date_prevue, urgence, ordre_passage, client_nom, site_adresse, fenetre')
    .eq('date_prevue', dateIso);
  if (error || !data) return 0;

  const rows = data as PlanningViewRow[];
  const locales: LocalIntervention[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    date_prevue: r.date_prevue,
    urgence: r.urgence ? 1 : 0,
    ordre_passage: r.ordre_passage,
    client_nom: r.client_nom,
    site_adresse: r.site_adresse,
    fenetre: r.fenetre,
    updated_at: new Date().toISOString(),
  }));
  await upsertInterventions(locales);
  return locales.length;
}

/** Pousse les transitions en attente puis rafraîchit la tournée du jour. */
export async function synchroniser(dateIso: string): Promise<{ envoyes: number; echecs: number; tires: number }> {
  const push = await pousserEnAttente();
  const tires = await tirerInterventionsDuJour(dateIso);
  return { ...push, tires };
}
