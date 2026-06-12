'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export interface PlanningState {
  error: string | null;
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
