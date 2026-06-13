'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export interface CamionState {
  error: string | null;
  ok?: boolean;
}

const strOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

type AdminCheck = { ok: true; orgId: string } | { ok: false; error: string };

async function requireAdmin(): Promise<AdminCheck> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { ok: false, error: 'Session invalide.' };
  if (user.role !== 'admin') return { ok: false, error: 'Réservé aux administrateurs.' };
  return { ok: true, orgId: user.orgId };
}

export async function creerCamion(_prev: CamionState | null, formData: FormData): Promise<CamionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const immatriculation = String(formData.get('immatriculation') ?? '').trim();
  const type = String(formData.get('type') ?? 'hydrocureur');
  const capacite = Number(formData.get('capacite') ?? 0);
  if (!immatriculation) return { error: "L'immatriculation est obligatoire." };
  if (!Number.isFinite(capacite) || capacite <= 0) return { error: 'Capacité de citerne invalide.' };

  const supabase = await createClient();
  const { error } = await supabase.from('camions').insert({
    organisation_id: auth.orgId,
    immatriculation,
    type,
    capacite_citerne_m3: capacite,
    controle_technique_echeance: strOrNull(formData.get('ct')),
    adr_validite: strOrNull(formData.get('adr')),
  } as never);
  if (error) return { error: 'Création impossible : ' + error.message };
  revalidatePath('/app/parametres');
  return { error: null, ok: true };
}

export async function modifierCamion(_prev: CamionState | null, formData: FormData): Promise<CamionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = String(formData.get('camion_id') ?? '');
  const immatriculation = String(formData.get('immatriculation') ?? '').trim();
  const type = String(formData.get('type') ?? 'hydrocureur');
  const capacite = Number(formData.get('capacite') ?? 0);
  if (!id) return { error: 'Camion manquant.' };
  if (!immatriculation) return { error: "L'immatriculation est obligatoire." };
  if (!Number.isFinite(capacite) || capacite <= 0) return { error: 'Capacité de citerne invalide.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('camions')
    .update({
      immatriculation,
      type,
      capacite_citerne_m3: capacite,
      controle_technique_echeance: strOrNull(formData.get('ct')),
      adr_validite: strOrNull(formData.get('adr')),
    } as never)
    .eq('id', id);
  if (error) return { error: 'Modification impossible : ' + error.message };
  revalidatePath('/app/parametres');
  return { error: null, ok: true };
}

export async function basculerActifCamion(formData: FormData): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) return;
  const id = String(formData.get('camion_id') ?? '');
  const actif = String(formData.get('actif') ?? '') === 'true';
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('camions').update({ actif: !actif } as never).eq('id', id);
  revalidatePath('/app/parametres');
}
