'use server';

import { revalidatePath } from 'next/cache';
import { optimiserTournee, type PointTournee } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';
import { matriceTrajetMapbox } from '@/lib/mapbox-matrix';
import { getCurrentUser } from '@/lib/auth';

export interface PlanningState {
  error: string | null;
}

export interface OptimiseState {
  error: string | null;
  /** Gain en pourcentage (entier) par rapport à l'ordre précédent. */
  gainPct?: number;
  /** Source des distances : routier Mapbox ou vol d'oiseau. */
  mode?: 'mapbox' | 'haversine';
  /** Message court prêt à afficher. */
  phrase?: string;
}

export async function affecterIntervention(
  _prev: PlanningState | null,
  formData: FormData,
): Promise<PlanningState> {
  const interventionId = String(formData.get('intervention_id') ?? '');
  const camionId = String(formData.get('camion_id') ?? '');
  const date = String(formData.get('date') ?? '');
  if (!interventionId || !camionId || !date) {
    return { error: 'Intervention, camion et date sont requis.' };
  }

  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_affecter_intervention', {
    p_intervention_id: interventionId,
    p_camion_id: camionId,
    p_date: date,
  } as never);
  if (error) return { error: "Affectation impossible : " + error.message };

  revalidatePath('/app/planning');
  return { error: null };
}

export async function desaffecterIntervention(formData: FormData): Promise<void> {
  const interventionId = String(formData.get('intervention_id') ?? '');
  if (!interventionId) return;
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_desaffecter_intervention', {
    p_intervention_id: interventionId,
  } as never);
  revalidatePath('/app/planning');
}

/**
 * Optimise l'ordre de passage d'une tournée (2-opt sur les coordonnées des
 * sites). Les arrêts sans coordonnées géocodées sont conservés en fin de
 * tournée, dans leur ordre courant. Le calcul vit dans @bordero/core ; seul le
 * nouvel ordre est persisté via une RPC cloisonnée.
 */
export async function optimiserTourneeAction(
  _prev: OptimiseState | null,
  formData: FormData,
): Promise<OptimiseState> {
  const tourneeId = String(formData.get('tournee_id') ?? '');
  if (!tourneeId) return { error: 'Tournée manquante.' };
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const supabase = await createClient();

  const { data } = await supabase
    .from('v_planning_interventions')
    .select('id, ordre_passage, site_lng, site_lat')
    .eq('tournee_id', tourneeId)
    .order('ordre_passage');
  const rows = (data ?? []) as Array<{
    id: string;
    ordre_passage: number | null;
    site_lng: number | null;
    site_lat: number | null;
  }>;

  const avecCoords: PointTournee[] = [];
  const sansCoords: string[] = [];
  for (const r of rows) {
    if (r.site_lat != null && r.site_lng != null) {
      avecCoords.push({ id: r.id, lat: r.site_lat, lng: r.site_lng });
    } else {
      sansCoords.push(r.id);
    }
  }
  if (avecCoords.length < 2) {
    return { error: null, phrase: 'Pas assez d’arrêts géolocalisés pour optimiser.' };
  }

  // Distances routières réelles (Mapbox) si possible, sinon vol d'oiseau.
  const distance = await matriceTrajetMapbox(avecCoords);
  const mode: 'mapbox' | 'haversine' = distance ? 'mapbox' : 'haversine';

  const { ordreIds, ameliorationPct } = optimiserTournee(avecCoords, distance ? { distance } : {});
  const ordreFinal = [...ordreIds, ...sansCoords];

  const { error } = await supabase.rpc('rpc_optimiser_tournee', {
    p_tournee_id: tourneeId,
    p_ordre: ordreFinal,
  } as never);
  if (error) return { error: 'Optimisation impossible : ' + error.message };

  revalidatePath('/app/planning');
  const gainPct = Math.round(ameliorationPct * 100);
  const source = mode === 'mapbox' ? 'trajet routier' : 'à vol d’oiseau';
  return {
    error: null,
    gainPct,
    mode,
    phrase: gainPct > 0 ? `Tournée réordonnée, ${gainPct} % de ${source} en moins.` : 'Ordre déjà optimal.',
  };
}

export async function deplacerIntervention(formData: FormData): Promise<void> {
  const interventionId = String(formData.get('intervention_id') ?? '');
  const sens = Number(formData.get('sens') ?? 0);
  if (!interventionId || !sens) return;
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_deplacer_intervention', {
    p_intervention_id: interventionId,
    p_sens: sens,
  } as never);
  revalidatePath('/app/planning');
}
