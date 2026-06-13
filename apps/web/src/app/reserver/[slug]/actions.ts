'use server';

import { createClient } from '@/lib/supabase/server';

export interface ReservationState {
  error: string | null;
  ok?: boolean;
}

/**
 * Enregistre une demande de réservation publique via la RPC anon
 * rpc_creer_demande_reservation (cloisonnée par le slug de l'organisation).
 */
export async function creerDemande(
  _prev: ReservationState | null,
  formData: FormData,
): Promise<ReservationState> {
  const slug = String(formData.get('slug') ?? '');
  const nom = String(formData.get('contact_nom') ?? '');
  if (!slug) return { error: 'Lien de réservation invalide.' };
  if (!nom.trim()) return { error: 'Merci d’indiquer votre nom.' };

  const tel = String(formData.get('contact_telephone') ?? '');
  const email = String(formData.get('contact_email') ?? '');
  if (!tel.trim() && !email.trim()) {
    return { error: 'Indiquez un téléphone ou un email pour être recontacté.' };
  }

  const lng = formData.get('lng');
  const lat = formData.get('lat');

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_creer_demande_reservation', {
    p_slug: slug,
    p_nom: nom,
    p_telephone: tel,
    p_email: email,
    p_adresse: String(formData.get('adresse') ?? ''),
    p_lng: lng ? Number(lng) : null,
    p_lat: lat ? Number(lat) : null,
    p_type_ouvrage: String(formData.get('type_ouvrage') ?? ''),
    p_creneau: String(formData.get('creneau_souhaite') ?? ''),
    p_message: String(formData.get('message') ?? ''),
    p_honeypot: String(formData.get('site_web') ?? ''),
  } as never);

  if (error) return { error: 'Envoi impossible : ' + error.message };
  return { error: null, ok: true };
}
