'use server';

import { redirect } from 'next/navigation';
import { calculerPrixLigneCents, appliquerTVACents } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export interface CommandeState {
  error: string | null;
}

interface PrestationRow {
  id: string;
  libelle: string;
  prix_base_cents: number;
  majoration_urgence_pct: number;
  majoration_weekend_pct: number;
  volume_forfait_m3: number | null;
  prix_m3_supplementaire_cents: number | null;
  tva_taux: number;
}

const num = (v: unknown): number => Number(v ?? 0);

export async function creerCommande(
  _prev: CommandeState | null,
  formData: FormData,
): Promise<CommandeState> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };

  const clientId = String(formData.get('client_id') ?? '');
  const siteId = String(formData.get('site_id') ?? '');
  const ouvrageId = String(formData.get('ouvrage_id') ?? '') || null;
  const prestationId = String(formData.get('prestation_id') ?? '');
  const urgence = formData.get('urgence') === 'on';
  const weekend = formData.get('weekend') === 'on';
  const volume = formData.get('volume') ? Number(formData.get('volume')) : undefined;
  const datePrevue = String(formData.get('date_prevue') ?? '') || null;
  const fenetre = String(formData.get('fenetre') ?? '') || null;

  if (!clientId || !siteId || !prestationId) {
    return { error: 'Client, site et prestation sont obligatoires.' };
  }

  const supabase = await createClient();

  // Recalcul du prix côté serveur (ne jamais faire confiance au client).
  const { data: prestaData, error: prestaErr } = await supabase
    .from('prestations')
    .select(
      'id, libelle, prix_base_cents, majoration_urgence_pct, majoration_weekend_pct, volume_forfait_m3, prix_m3_supplementaire_cents, tva_taux',
    )
    .eq('id', prestationId)
    .maybeSingle();
  if (prestaErr || !prestaData) return { error: 'Prestation introuvable.' };
  const presta = prestaData as PrestationRow;

  const prixHt = calculerPrixLigneCents(
    {
      prixBaseCents: num(presta.prix_base_cents),
      majorationUrgencePct: num(presta.majoration_urgence_pct),
      majorationWeekendPct: num(presta.majoration_weekend_pct),
      volumeForfaitM3: presta.volume_forfait_m3 == null ? undefined : num(presta.volume_forfait_m3),
      prixM3SupplementaireCents:
        presta.prix_m3_supplementaire_cents == null ? undefined : num(presta.prix_m3_supplementaire_cents),
    },
    { urgence, weekend, volumeReelM3: volume },
  );
  const { ttcCents } = appliquerTVACents(prixHt, num(presta.tva_taux));

  // Commande
  const { data: cmdData, error: cmdErr } = await supabase
    .from('commandes')
    .insert({ organisation_id: user.orgId, client_id: clientId, site_id: siteId, urgence } as never)
    .select('id')
    .single();
  if (cmdErr || !cmdData) return { error: 'Création de la commande impossible : ' + (cmdErr?.message ?? '') };
  const commandeId = (cmdData as { id: string }).id;

  // Ligne de commande (prix figé)
  await supabase.from('commande_lignes').insert({
    organisation_id: user.orgId,
    commande_id: commandeId,
    prestation_id: presta.id,
    designation: presta.libelle,
    quantite: 1,
    prix_ht_cents: prixHt,
    tva_taux: num(presta.tva_taux),
  } as never);

  // Intervention
  const status = datePrevue ? 'PLANIFIEE' : 'BROUILLON';
  const { data: intData } = await supabase
    .from('interventions')
    .insert({
      organisation_id: user.orgId,
      commande_id: commandeId,
      site_id: siteId,
      status,
      urgence,
      date_prevue: datePrevue,
      fenetre,
    } as never)
    .select('id')
    .single();
  const interventionId = (intData as { id: string } | null)?.id;

  if (interventionId && ouvrageId) {
    await supabase.from('intervention_ouvrages').insert({
      organisation_id: user.orgId,
      intervention_id: interventionId,
      ouvrage_id: ouvrageId,
    } as never);
  }

  void ttcCents;
  redirect(`/app/clients/${clientId}`);
}
