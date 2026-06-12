'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { renderFacturePdf, type FactureLigneData } from '@bordero/pdf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
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

// ============================================================
// Encaissement par lien de paiement Stripe (mode TEST uniquement)
// ============================================================
async function origineUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Crée une session Stripe Checkout (mode test) pour le solde dû d'une facture,
 * puis redirige vers la page de paiement hébergée par Stripe. Le paiement est
 * enregistré au retour (route /app/facturation/retour-stripe), idempotent.
 */
export async function creerSessionPaiement(formData: FormData): Promise<void> {
  const factureId = String(formData.get('facture_id') ?? '');
  if (!factureId) return;
  const user = await getCurrentUser();
  if (!user?.orgId) return;
  if (!isStripeConfigured()) redirect('/app/facturation?stripe=indisponible');

  const supabase = await createClient();
  const { data: facData } = await supabase
    .from('factures')
    .select('id, numero, statut, total_ttc_cents, client_id')
    .eq('id', factureId)
    .maybeSingle();
  const fac = one<{
    id: string;
    numero: string | null;
    statut: string;
    total_ttc_cents: number;
    client_id: string;
  }>(facData);
  if (!fac) redirect('/app/facturation?stripe=erreur');
  if (fac!.statut === 'brouillon' || fac!.statut === 'payee') {
    redirect('/app/facturation?stripe=etat');
  }

  // Solde restant dû = TTC - paiements déjà enregistrés.
  const { data: paieData } = await supabase
    .from('paiements')
    .select('montant_cents')
    .eq('facture_id', factureId);
  const dejaPaye = ((paieData ?? []) as { montant_cents: number }[]).reduce(
    (s, p) => s + Number(p.montant_cents),
    0,
  );
  const reste = Number(fac!.total_ttc_cents) - dejaPaye;
  if (reste <= 0) redirect('/app/facturation?stripe=etat');

  const { data: cliData } = await supabase
    .from('clients')
    .select('nom, email')
    .eq('id', fac!.client_id)
    .maybeSingle();
  const client = one<{ nom: string; email: string | null }>(cliData);

  const origine = await origineUrl();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    customer_email: client?.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: reste,
          product_data: { name: `Facture ${fac!.numero ?? ''}`.trim() },
        },
      },
    ],
    metadata: { facture_id: factureId, organisation_id: user.orgId },
    success_url: `${origine}/app/facturation/retour-stripe?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origine}/app/facturation?stripe=annule`,
  });

  if (!session.url) redirect('/app/facturation?stripe=erreur');
  redirect(session.url!);
}

/**
 * Enregistre le paiement d'une session Stripe payée (appelé par la route de
 * retour). Vérifie l'état réel côté Stripe ; idempotent par PaymentIntent.
 */
export async function enregistrerPaiementSession(
  sessionId: string,
): Promise<{ ok: boolean; numero?: string }> {
  const user = await getCurrentUser();
  if (!user?.orgId) return { ok: false };
  if (!isStripeConfigured()) return { ok: false };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return { ok: false };

  const factureId = session.metadata?.facture_id;
  if (!factureId) return { ok: false };
  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const supabase = await createClient();
  const { error } = await supabase.rpc('rpc_enregistrer_paiement', {
    p_facture_id: factureId,
    p_montant_cents: session.amount_total ?? 0,
    p_mode: 'cb',
    p_reference: session.id,
    p_stripe_payment_intent: paymentIntent,
  } as never);
  if (error) return { ok: false };

  const { data: facData } = await supabase
    .from('factures')
    .select('numero')
    .eq('id', factureId)
    .maybeSingle();
  const numero = one<{ numero: string | null }>(facData)?.numero ?? undefined;

  revalidatePath('/app/facturation');
  return { ok: true, numero: numero ?? undefined };
}
