'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export interface ClientFormState {
  error: string | null;
}

export interface CrudState {
  error: string | null;
  ok?: boolean;
}

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const strOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

export async function creerClientSite(
  _prev: ClientFormState | null,
  formData: FormData,
): Promise<ClientFormState> {
  const type = String(formData.get('type') ?? 'particulier');
  const nom = String(formData.get('nom') ?? '').trim();
  const telephone = String(formData.get('telephone') ?? '');
  const email = String(formData.get('email') ?? '');
  const adresse = String(formData.get('adresse') ?? '').trim();
  const siret = String(formData.get('siret') ?? '').trim();
  const lngRaw = formData.get('lng');
  const latRaw = formData.get('lat');
  const lng = lngRaw ? Number(lngRaw) : null;
  const lat = latRaw ? Number(latRaw) : null;

  if (!nom) return { error: 'Le nom du client est obligatoire.' };

  const supabase = await createClient();
  // Cast nécessaire : l'inférence générique de supabase-js/ssr ne thread pas le
  // type Database jusqu'à .rpc dans ce setup monorepo (à harmoniser via un helper typé).
  const params = {
    p_type: type,
    p_nom: nom,
    p_telephone: telephone,
    p_email: email,
    p_adresse: adresse,
    p_lng: lng,
    p_lat: lat,
    p_siret: siret || null,
  };
  const { data, error } = await supabase.rpc('rpc_creer_client_site', params as never);

  if (error) {
    return { error: 'Création impossible : ' + error.message };
  }
  const clientId = data as unknown as string;
  revalidatePath('/app/clients');
  redirect(`/app/clients/${clientId}`);
}

export async function modifierClient(_prev: CrudState | null, formData: FormData): Promise<CrudState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const id = String(formData.get('client_id') ?? '');
  const type = String(formData.get('type') ?? 'particulier');
  const nom = String(formData.get('nom') ?? '').trim();
  if (!id) return { error: 'Client manquant.' };
  if (!nom) return { error: 'Le nom du client est obligatoire.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clients')
    .update({
      type,
      nom,
      telephone: strOrNull(formData.get('telephone')),
      email: strOrNull(formData.get('email')),
      siret: strOrNull(formData.get('siret')),
    } as never)
    .eq('id', id);
  if (error) return { error: 'Modification impossible : ' + error.message };
  revalidatePath(`/app/clients/${id}`);
  revalidatePath('/app/clients');
  return { error: null, ok: true };
}

// ============================================================
// Sites (CRUD depuis la fiche client)
// ============================================================
export async function creerSite(_prev: CrudState | null, formData: FormData): Promise<CrudState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const clientId = String(formData.get('client_id') ?? '');
  const adresse = String(formData.get('adresse') ?? '').trim();
  if (!clientId) return { error: 'Client manquant.' };
  if (!adresse) return { error: "L'adresse du site est obligatoire." };

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_creer_site', {
    p_client_id: clientId,
    p_adresse: adresse,
    p_lng: numOrNull(formData.get('lng')),
    p_lat: numOrNull(formData.get('lat')),
    p_instructions_acces: strOrNull(formData.get('instructions_acces')),
  } as never);
  if (error) return { error: 'Création impossible : ' + error.message };
  revalidatePath(`/app/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function modifierSite(_prev: CrudState | null, formData: FormData): Promise<CrudState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const siteId = String(formData.get('site_id') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  const adresse = String(formData.get('adresse') ?? '').trim();
  if (!siteId) return { error: 'Site manquant.' };
  if (!adresse) return { error: "L'adresse du site est obligatoire." };

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_modifier_site', {
    p_site_id: siteId,
    p_adresse: adresse,
    p_lng: numOrNull(formData.get('lng')),
    p_lat: numOrNull(formData.get('lat')),
    p_instructions_acces: strOrNull(formData.get('instructions_acces')),
  } as never);
  if (error) return { error: 'Modification impossible : ' + error.message };
  revalidatePath(`/app/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function supprimerSite(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const siteId = String(formData.get('site_id') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  if (!siteId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_supprimer_site', { p_site_id: siteId } as never);
  revalidatePath(`/app/clients/${clientId}`);
}

// ============================================================
// Ouvrages (CRUD depuis la fiche client)
// ============================================================
export async function creerOuvrage(_prev: CrudState | null, formData: FormData): Promise<CrudState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const siteId = String(formData.get('site_id') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  const type = String(formData.get('type') ?? '');
  if (!siteId || !type) return { error: 'Site et type sont requis.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_creer_ouvrage', {
    p_site_id: siteId,
    p_type: type,
    p_volume: numOrNull(formData.get('volume')),
    p_periodicite_mois: numOrNull(formData.get('periodicite_mois')),
    p_date_derniere: strOrNull(formData.get('date_derniere')),
    p_localisation: strOrNull(formData.get('localisation')),
  } as never);
  if (error) return { error: 'Création impossible : ' + error.message };
  revalidatePath(`/app/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function modifierOuvrage(_prev: CrudState | null, formData: FormData): Promise<CrudState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const ouvrageId = String(formData.get('ouvrage_id') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  const type = String(formData.get('type') ?? '');
  if (!ouvrageId || !type) return { error: 'Ouvrage et type sont requis.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_modifier_ouvrage', {
    p_ouvrage_id: ouvrageId,
    p_type: type,
    p_volume: numOrNull(formData.get('volume')),
    p_periodicite_mois: numOrNull(formData.get('periodicite_mois')),
    p_date_derniere: strOrNull(formData.get('date_derniere')),
    p_localisation: strOrNull(formData.get('localisation')),
  } as never);
  if (error) return { error: 'Modification impossible : ' + error.message };
  revalidatePath(`/app/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function supprimerOuvrage(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const ouvrageId = String(formData.get('ouvrage_id') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  if (!ouvrageId) return;
  const supabase = await createClient();
  await supabase.rpc('rpc_supprimer_ouvrage', { p_ouvrage_id: ouvrageId } as never);
  revalidatePath(`/app/clients/${clientId}`);
}
