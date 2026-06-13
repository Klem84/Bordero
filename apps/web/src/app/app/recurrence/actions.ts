'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function planifierRelance(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const ouvrageId = String(formData.get('ouvrage_id') ?? '');
  const canal = String(formData.get('canal') ?? 'telephone');
  if (!ouvrageId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_creer_relance_recurrence', {
    p_ouvrage_id: ouvrageId,
    p_canal: canal,
  } as never);
  revalidatePath('/app/recurrence');
}

export async function marquerRelance(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const relanceId = String(formData.get('relance_id') ?? '');
  const statut = String(formData.get('statut') ?? '');
  if (!relanceId || !statut) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_marquer_relance', {
    p_relance_id: relanceId,
    p_statut: statut,
  } as never);
  revalidatePath('/app/recurrence');
}

export async function avancerRelance(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const relanceId = String(formData.get('relance_id') ?? '');
  if (!relanceId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_avancer_relance', { p_relance_id: relanceId } as never);
  revalidatePath('/app/recurrence');
}

export async function genererRelancesDues(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_generer_relances_dues', {} as never);
  revalidatePath('/app/recurrence');
}
