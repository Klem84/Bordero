'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

/** Change le statut d'une demande de réservation (traitee / rejetee / nouvelle). */
export async function traiterDemande(formData: FormData): Promise<void> {
  const id = String(formData.get('demande_id') ?? '');
  const statut = String(formData.get('statut') ?? '');
  if (!id || !statut) return;
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_traiter_demande', { p_id: id, p_statut: statut } as never);
  revalidatePath('/app/reservations');
}
