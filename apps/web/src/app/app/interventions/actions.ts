'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  construireDonneesBordereau,
  construireBsddInput,
  bsddTransmissible,
  type DechetClassification,
  type ConstruireBsddInput,
} from '@bordero/core';
import { renderBsmvPdf } from '@bordero/pdf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { creerBsddTrackdechets } from '@/lib/trackdechets';
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
    .select('nom, siret, telephone, email')
    .eq('id', site?.client_id ?? '')
    .maybeSingle();
  const client = one<{ nom: string; siret: string | null; telephone: string | null; email: string | null }>(
    clientData,
  );

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

  // 4) BSDD : transmission à Trackdéchets (déchets dangereux), best-effort.
  if (res.type === 'BSDD') {
    await transmettreBsdd(res.bordereau_id);
  }

  revalidatePath('/app/conformite/registre');
  revalidatePath(`/app/interventions/${interventionId}`);
  return { error: null, ok: { numero: res.numero } };
}

/**
 * Transmet (ou retransmet) un bordereau BSDD à Trackdéchets. Réassemble les
 * données depuis la base, applique le mapping (@bordero/core) et persiste
 * l'identifiant/statut renvoyé. Mode dégradé : si le jeton n'est pas configuré
 * ou si des champs obligatoires manquent (SIRET, quantité), le bordereau est
 * marqué NON_TRANSMIS sans bloquer. Cloisonné par organisation.
 */
export async function transmettreBsdd(bordereauId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  const supabase = await createClient();

  const { data: bData } = await supabase
    .from('bordereaux')
    .select('id, numero, type, statut, intervention_id, exutoire_id, quantite_pompee_m3, nature_matiere')
    .eq('id', bordereauId)
    .maybeSingle();
  const bord = one<{
    id: string;
    numero: string;
    type: string;
    statut: string;
    intervention_id: string | null;
    exutoire_id: string | null;
    quantite_pompee_m3: number | null;
    nature_matiere: string | null;
  }>(bData);
  if (!bord || bord.type !== 'BSDD') return;

  // Producteur = propriétaire de l'installation (client).
  let client: { nom: string; siret: string | null; telephone: string | null; email: string | null } | null = null;
  if (bord.intervention_id) {
    const { data: intData } = await supabase
      .from('interventions')
      .select('site_id')
      .eq('id', bord.intervention_id)
      .maybeSingle();
    const siteId = one<{ site_id: string }>(intData)?.site_id ?? '';
    const { data: siteData } = await supabase.from('sites').select('client_id').eq('id', siteId).maybeSingle();
    const clientId = one<{ client_id: string }>(siteData)?.client_id ?? '';
    const { data: cData } = await supabase
      .from('clients')
      .select('nom, siret, telephone, email')
      .eq('id', clientId)
      .maybeSingle();
    client = one<{ nom: string; siret: string | null; telephone: string | null; email: string | null }>(cData);
  }

  const { data: orgData } = await supabase
    .from('organisations')
    .select('raison_sociale, siret')
    .eq('id', user.orgId)
    .maybeSingle();
  const org = one<{ raison_sociale: string; siret: string | null }>(orgData);

  const { data: agrData } = await supabase
    .from('agrements')
    .select('departement_code')
    .eq('statut', 'actif')
    .limit(1)
    .maybeSingle();
  const agr = one<{ departement_code: string }>(agrData);

  // Destinataire = exutoire (celui du bordereau, sinon le premier de l'organisation).
  let exutoire: {
    raison_sociale: string;
    siret: string | null;
    adresse: string | null;
    contact_responsable: string | null;
  } | null = null;
  {
    const q = supabase.from('exutoires').select('raison_sociale, siret, adresse, contact_responsable');
    const { data: exData } = bord.exutoire_id
      ? await q.eq('id', bord.exutoire_id).maybeSingle()
      : await q.limit(1).maybeSingle();
    exutoire = one<{
      raison_sociale: string;
      siret: string | null;
      adresse: string | null;
      contact_responsable: string | null;
    }>(exData);
  }

  const brut: ConstruireBsddInput = {
    reference: bord.numero,
    natureDechet: bord.nature_matiere ?? 'Déchet dangereux',
    quantiteTonnes: bord.quantite_pompee_m3, // approximation m³ ~ tonne (boues)
    producteur: {
      siret: client?.siret ?? null,
      nom: client?.nom ?? '',
      adresse: null,
      contact: client?.nom ?? null,
      telephone: client?.telephone ?? null,
      email: client?.email ?? null,
    },
    transporteur: {
      siret: org?.siret ?? null,
      nom: org?.raison_sociale ?? '',
      adresse: null,
      contact: null,
      telephone: null,
      email: null,
      recepisse: null,
      departement: agr?.departement_code ?? null,
    },
    destinataire: {
      siret: exutoire?.siret ?? null,
      nom: exutoire?.raison_sociale ?? '',
      adresse: exutoire?.adresse ?? null,
      contact: exutoire?.contact_responsable ?? null,
      telephone: null,
      email: null,
    },
  };

  const { ok, manque } = bsddTransmissible(brut);
  let maj: Record<string, unknown>;
  if (!ok) {
    // Données réglementaires incomplètes : distinct du « non transmis » technique.
    console.error('BSDD à compléter:', manque.join(', '));
    maj = { trackdechets_statut: 'A_COMPLETER' };
  } else {
    const r = await creerBsddTrackdechets(construireBsddInput(brut));
    maj = r.transmis
      ? {
          trackdechets_id: r.id ?? null,
          trackdechets_readable_id: r.readableId ?? null,
          trackdechets_statut: r.statut ?? 'SENT',
          trackdechets_transmis_le: new Date().toISOString(),
        }
      : { trackdechets_statut: 'NON_TRANSMIS' };
  }

  // Un bordereau déjà BOUCLE est immuable (trigger RG-2.1) : la mise à jour des
  // colonnes de suivi Trackdéchets échouerait. On ne bloque pas l'utilisateur :
  // en pratique la transmission a lieu à la clôture (statut EMIS).
  try {
    await supabase.from('bordereaux').update(maj as never).eq('id', bordereauId);
  } catch (e) {
    console.error('Maj suivi Trackdéchets:', (e as Error).message);
  }
  revalidatePath('/app/conformite/registre');
}

/** Action de formulaire : retransmettre un BSDD depuis le registre. */
export async function transmettreBsddAction(formData: FormData): Promise<void> {
  const id = String(formData.get('bordereau_id') ?? '');
  if (!id) return;
  await transmettreBsdd(id);
}
