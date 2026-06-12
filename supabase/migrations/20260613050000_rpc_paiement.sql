-- Encaissement (M5) : enregistrement d'un paiement et mise à jour du statut de la
-- facture. Utilisé notamment au retour d'un paiement Stripe (mode TEST).
-- Idempotent par PaymentIntent Stripe (un retour rejoué ne double pas le paiement).

-- Garantit l'idempotence côté base : un PaymentIntent ne peut être enregistré qu'une fois.
create unique index if not exists idx_paiements_stripe_pi
  on public.paiements (organisation_id, stripe_payment_intent)
  where stripe_payment_intent is not null;

create or replace function public.rpc_enregistrer_paiement(
  p_facture_id uuid,
  p_montant_cents bigint,
  p_mode public.paiement_mode,
  p_reference text default null,
  p_stripe_payment_intent text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_ttc bigint;
  v_paye bigint;
  v_statut public.facture_statut;
  v_paiement uuid;
  v_existing uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  select total_ttc_cents into v_ttc from public.factures
    where id = p_facture_id and organisation_id = v_org;
  if not found then raise exception 'Facture introuvable dans votre organisation'; end if;

  -- Idempotence : si ce PaymentIntent est déjà enregistré, ne rien refaire.
  if p_stripe_payment_intent is not null then
    select id into v_existing from public.paiements
      where organisation_id = v_org and stripe_payment_intent = p_stripe_payment_intent;
    if found then
      return jsonb_build_object('paiement_id', v_existing, 'deja', true);
    end if;
  end if;

  insert into public.paiements (
    organisation_id, facture_id, mode, montant_cents, reference,
    stripe_payment_intent, rapproche, recu_le
  ) values (
    v_org, p_facture_id, p_mode, p_montant_cents, p_reference,
    p_stripe_payment_intent, p_stripe_payment_intent is not null, now()
  ) returning id into v_paiement;

  select coalesce(sum(montant_cents), 0) into v_paye
    from public.paiements where facture_id = p_facture_id;

  v_statut := case when v_paye >= v_ttc then 'payee'::public.facture_statut
                   else 'partiellement_payee'::public.facture_statut end;
  update public.factures set statut = v_statut where id = p_facture_id;

  return jsonb_build_object(
    'paiement_id', v_paiement, 'statut', v_statut::text,
    'paye_cents', v_paye, 'deja', false
  );
end $$;

grant execute on function public.rpc_enregistrer_paiement to authenticated;
