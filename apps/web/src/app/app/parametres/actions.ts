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

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ============================================================
// Exutoires (filières d'élimination) — admin
// ============================================================
export async function enregistrerExutoire(_prev: CamionState | null, formData: FormData): Promise<CamionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const id = String(formData.get('exutoire_id') ?? '');
  const raison = String(formData.get('raison_sociale') ?? '').trim();
  const type = String(formData.get('type') ?? 'station_epuration');
  if (!raison) return { error: 'La raison sociale est obligatoire.' };

  const payload = {
    raison_sociale: raison,
    type,
    adresse: strOrNull(formData.get('adresse')),
    siret: strOrNull(formData.get('siret')),
    contact_responsable: strOrNull(formData.get('contact')),
    tarif_depotage_m3_cents: numOrNull(formData.get('tarif_euros')) != null
      ? Math.round((numOrNull(formData.get('tarif_euros')) as number) * 100)
      : null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('exutoires').update(payload as never).eq('id', id)
    : await supabase.from('exutoires').insert({ organisation_id: auth.orgId, ...payload } as never);
  if (error) return { error: 'Enregistrement impossible : ' + error.message };
  revalidatePath('/app/parametres');
  return { error: null, ok: true };
}

export async function supprimerExutoire(formData: FormData): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) return;
  const id = String(formData.get('exutoire_id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('exutoires').delete().eq('id', id);
  revalidatePath('/app/parametres');
}

// ============================================================
// Agréments préfectoraux — admin
// ============================================================
export async function enregistrerAgrement(_prev: CamionState | null, formData: FormData): Promise<CamionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const id = String(formData.get('agrement_id') ?? '');
  const dept = String(formData.get('departement_code') ?? '').trim();
  const numero = String(formData.get('numero') ?? '').trim();
  const delivrance = strOrNull(formData.get('date_delivrance'));
  const echeance = strOrNull(formData.get('date_echeance'));
  if (!dept) return { error: 'Le code département est obligatoire.' };
  if (!numero) return { error: "Le numéro d'agrément est obligatoire." };
  if (!delivrance || !echeance) return { error: 'Les dates de délivrance et d’échéance sont obligatoires.' };

  const payload = {
    departement_code: dept,
    departement_libelle: strOrNull(formData.get('departement_libelle')),
    numero,
    date_delivrance: delivrance,
    date_echeance: echeance,
    quantite_max_annuelle_m3: numOrNull(formData.get('quota')),
    statut: String(formData.get('statut') ?? 'actif'),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('agrements').update(payload as never).eq('id', id)
    : await supabase.from('agrements').insert({ organisation_id: auth.orgId, ...payload } as never);
  if (error) return { error: 'Enregistrement impossible : ' + error.message };
  revalidatePath('/app/parametres');
  revalidatePath('/app/conformite');
  return { error: null, ok: true };
}

export async function supprimerAgrement(formData: FormData): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) return;
  const id = String(formData.get('agrement_id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('agrements').delete().eq('id', id);
  revalidatePath('/app/parametres');
  revalidatePath('/app/conformite');
}

// ============================================================
// Portail public de réservation — admin
// ============================================================
export async function majReservation(_prev: CamionState | null, formData: FormData): Promise<CamionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  // Normalise le slug : minuscules, lettres/chiffres/tirets, sans tirets en bord ni doublons.
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length < 3) {
    return { error: 'Le lien doit faire au moins 3 caractères (lettres, chiffres, tirets).' };
  }
  const active = String(formData.get('reservation_active') ?? '') === 'on';

  const supabase = await createClient();
  const { error } = await supabase
    .from('organisations')
    .update({ slug, reservation_active: active } as never)
    .eq('id', auth.orgId);
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
      return { error: 'Ce lien est déjà utilisé par une autre entreprise. Choisissez-en un autre.' };
    }
    return { error: 'Enregistrement impossible : ' + error.message };
  }
  revalidatePath('/app/parametres');
  return { error: null, ok: true };
}
