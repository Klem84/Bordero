'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { renderFacturePdf, type FactureLigneData } from '@bordero/pdf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';

export interface FactureState {
  error: string | null;
  ok?: { numero: string };
}

const one = <T>(v: unknown): T | null => (v ?? null) as T | null;

export async function facturerIntervention(
  _prev: FactureState | null,
  formData: FormData,
): Promise<FactureState> {
  const interventionId = String(formData.get('intervention_id') ?? '');
  if (!interventionId) return { error: 'Intervention manquante.' };
  const user = await getCurrentUser();
  if (!user?.orgId) return { error: 'Session invalide.' };
  const supabase = await createClient();

  const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_facturer_intervention', {
    p_intervention_id: interventionId,
  } as never);
  if (rpcErr || !rpcData) return { error: 'Facturation impossible : ' + (rpcErr?.message ?? '') };
  const res = rpcData as { facture_id: string; numero: string; ttc_cents: number };

  // Assemblage des données PDF
  const { data: facData } = await supabase
    .from('factures')
    .select('numero, emise_le, echeance, client_id, total_ht_cents, total_tva_cents, total_ttc_cents')
    .eq('id', res.facture_id)
    .maybeSingle();
  const fac = one<{
    numero: string;
    emise_le: string | null;
    echeance: string | null;
    client_id: string;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
  }>(facData);

  const { data: lignesData } = await supabase
    .from('facture_lignes')
    .select('designation, quantite, pu_ht_cents, tva_taux')
    .eq('facture_id', res.facture_id)
    .order('ordre');
  const lignes = (lignesData ?? []) as FactureLigneData[];

  const { data: clientData } = await supabase
    .from('clients')
    .select('nom')
    .eq('id', fac?.client_id ?? '')
    .maybeSingle();
  const client = one<{ nom: string }>(clientData);

  const { data: orgData } = await supabase
    .from('organisations')
    .select('raison_sociale, siret, adresse')
    .eq('id', user.orgId)
    .maybeSingle();
  const org = one<{ raison_sociale: string; siret: string | null; adresse: string | null }>(orgData);

  try {
    const pdf = await renderFacturePdf({
      numero: res.numero,
      dateIso: fac?.emise_le ?? new Date().toISOString(),
      echeanceIso: fac?.echeance ?? null,
      organisation: {
        raisonSociale: org?.raison_sociale ?? '',
        siret: org?.siret ?? null,
        adresse: org?.adresse ?? null,
      },
      client: { nom: client?.nom ?? '', adresse: null },
      lignes,
      totalHtCents: Number(fac?.total_ht_cents ?? 0),
      totalTvaCents: Number(fac?.total_tva_cents ?? 0),
      totalTtcCents: Number(fac?.total_ttc_cents ?? 0),
    });
    const sha = createHash('sha256').update(pdf).digest('hex');
    const path = `${user.orgId}/factures/${res.facture_id}.pdf`;
    const admin = createAdminClient();
    const { error: upErr } = await admin.storage
      .from('documents')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (!upErr) {
      await supabase.from('factures').update({ pdf_url: path, pdf_sha256: sha } as never).eq('id', res.facture_id);
    }
  } catch (e) {
    console.error('PDF facture:', e);
  }

  revalidatePath('/app/facturation');
  revalidatePath(`/app/interventions/${interventionId}`);
  return { error: null, ok: { numero: res.numero } };
}
