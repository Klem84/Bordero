-- RPC de facturation : crée une facture depuis la commande d'une intervention (M5, RG-9.1).
-- Respecte l'immuabilité : on remplit en brouillon (lignes + totaux), puis on émet.

create or replace function public.rpc_facturer_intervention(p_intervention_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_commande uuid;
  v_client uuid;
  v_numero text;
  v_fac uuid;
  v_ht bigint;
  v_tva bigint;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  select commande_id into v_commande from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if v_commande is null then
    raise exception 'Aucune commande liée à cette intervention';
  end if;
  select client_id into v_client from public.commandes where id = v_commande;

  -- Déjà facturée ?
  if exists (select 1 from public.factures where intervention_id = p_intervention_id and kind = 'facture') then
    raise exception 'Intervention déjà facturée';
  end if;

  v_numero := public.reserver_numero(v_org, 'FACTURE', 'F', extract(year from now())::int);

  -- 1) Facture en brouillon
  insert into public.factures (organisation_id, client_id, intervention_id, numero, statut, echeance)
    values (v_org, v_client, p_intervention_id, v_numero, 'brouillon', current_date + interval '30 days')
    returning id into v_fac;

  -- 2) Lignes recopiées de la commande
  insert into public.facture_lignes (organisation_id, facture_id, designation, quantite, pu_ht_cents, tva_taux, ordre)
    select organisation_id, v_fac, designation, quantite, prix_ht_cents, tva_taux, ordre
    from public.commande_lignes where commande_id = v_commande;

  -- 3) Totaux
  select coalesce(sum(pu_ht_cents * quantite), 0),
         coalesce(sum(round(pu_ht_cents * quantite * tva_taux / 100.0)), 0)
    into v_ht, v_tva
    from public.facture_lignes where facture_id = v_fac;
  update public.factures
    set total_ht_cents = v_ht, total_tva_cents = v_tva, total_ttc_cents = v_ht + v_tva
    where id = v_fac;

  -- 4) Émission (verrouille la facture)
  update public.factures set statut = 'emise', emise_le = now() where id = v_fac;

  return jsonb_build_object('facture_id', v_fac, 'numero', v_numero, 'ttc_cents', v_ht + v_tva);
end $$;

grant execute on function public.rpc_facturer_intervention to authenticated;
