'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { construireDonneesBordereau, type DechetClassification } from '@bordero/core';
import { renderBsmvPdf } from '@bordero/pdf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';

export interface ClotureState {
  error: string | null;
  ok?: { numero: string };
}

const one = <T>(v: unknown): T | null => (v ?? null) as T | null;

export async function cloturerIntervention(
  _prev: ClotureState | null,
  formData: FormData,
): Promise<ClotureState> {
  const interventionId = String(formData.get('intervention_id') ?? '');
  const exutoireId = String(formData.get('exutoire_id') ?? '') || null;
  const quantite = formData.get('quantite') ? Number(formData.get('quantite')) : null;
  if (!interventionId) return { error: 'Intervention manquante.' };

  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const supabase = await createClient();

  // 1) Clôture + numéro + bordereau (RPC SECURITY DEFINER)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_clore_intervention', {
    p_intervention_id: interventionId,
    p_exutoire_id: exutoireId,
    p_quantite_m3: quantite,
  } as never);
  if (rpcErr || !rpcData) return { error: 'Clôture impossible : ' + (rpcErr?.message ?? '') };
  const res = rpcData as { bordereau_id: string; numero: string; type: string };

  // 2) Assemblage des données du bordereau
  const { data: intData } = await supabase
    .from('interventions')
    .select('site_id, camion_id')
    .eq('id', interventionId)
    .maybeSingle();
  const inter = one<{ site_id: string; camion_id: string | null }>(intData);

  const { data: siteData } = await supabase
    .from('sites')
    .select('adresse, client_id')
    .eq('id', inter?.site_id ?? '')
    .maybeSingle();
  const site = one<{ adresse: string; client_id: string }>(siteData);

  const { data: clientData } = await supabase
    .from('clients')
    .select('nom')
    .eq('id', site?.client_id ?? '')
    .maybeSingle();
  const client = one<{ nom: string }>(clientData);

  const { data: orgData } = await supabase
    .from('organisations')
    .select('raison_sociale, siret')
    .eq('id', user.orgId)
    .maybeSingle();
  const org = one<{ raison_sociale: string; siret: string | null }>(orgData);

  const { data: agrData } = await supabase
    .from('agrements')
    .select('numero, departement_code')
    .eq('statut', 'actif')
    .limit(1)
    .maybeSingle();
  const agr = one<{ numero: string; departement_code: string }>(agrData);

  const { data: ouvrData } = await supabase
    .from('intervention_ouvrages')
    .select('classification_dechet, ouvrage_id')
    .eq('intervention_id', interventionId)
    .limit(1)
    .maybeSingle();
  const ouvr = one<{ classification_dechet: string; ouvrage_id: string | null }>(ouvrData);

  let immatriculation: string | null = null;
  if (inter?.camion_id) {
    const { data: cam } = await supabase
      .from('camions')
      .select('immatriculation')
      .eq('id', inter.camion_id)
      .maybeSingle();
    immatriculation = one<{ immatriculation: string }>(cam)?.immatriculation ?? null;
  }

  const data = construireDonneesBordereau({
    numero: res.numero,
    classification: (ouvr?.classification_dechet as DechetClassification) ?? 'MATIERES_VIDANGE_ANC',
    dateIso: new Date().toISOString(),
    vidangeur: {
      raisonSociale: org?.raison_sociale ?? '',
      siret: org?.siret ?? null,
      numeroAgrement: agr?.numero ?? null,
      departement: agr?.departement_code ?? null,
      immatriculation,
    },
    installation: {
      proprietaireNom: client?.nom ?? '',
      proprietaireAdresse: site?.adresse ?? null,
      adresseInstallation: site?.adresse ?? '',
      typeOuvrage: null,
      volumeLitres: null,
    },
    matiere: { nature: 'Matières de vidange', quantitePompeeM3: quantite },
    destination: { exutoireRaisonSociale: null, exutoireAdresse: null, quantiteDepoteeM3: null },
  });

  // 3) Génération PDF + empreinte + stockage
  try {
    const pdf = await renderBsmvPdf(data);
    const sha = createHash('sha256').update(pdf).digest('hex');
    const path = `${user.orgId}/${res.bordereau_id}.pdf`;
    const admin = createAdminClient();
    const { error: upErr } = await admin.storage
      .from('documents')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (!upErr) {
      await supabase.from('bordereaux').update({ pdf_url: path, pdf_sha256: sha } as never).eq('id', res.bordereau_id);
    }
  } catch (e) {
    // Le bordereau existe même si le PDF échoue : on ne bloque pas la clôture.
    console.error('PDF/stockage bordereau:', e);
  }

  revalidatePath('/app/conformite/registre');
  revalidatePath(`/app/interventions/${interventionId}`);
  return { error: null, ok: { numero: res.numero } };
}
