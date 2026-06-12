'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface ClientFormState {
  error: string | null;
}

export async function creerClientSite(
  _prev: ClientFormState | null,
  formData: FormData,
): Promise<ClientFormState> {
  const type = String(formData.get('type') ?? 'particulier');
  const nom = String(formData.get('nom') ?? '').trim();
  const telephone = String(formData.get('telephone') ?? '');
  const email = String(formData.get('email') ?? '');
  const adresse = String(formData.get('adresse') ?? '').trim();
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
  };
  const { data, error } = await supabase.rpc('rpc_creer_client_site', params as never);

  if (error) {
    return { error: 'Création impossible : ' + error.message };
  }
  const clientId = data as unknown as string;
  revalidatePath('/app/clients');
  redirect(`/app/clients/${clientId}`);
}
