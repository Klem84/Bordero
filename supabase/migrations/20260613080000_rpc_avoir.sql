-- M5 — Avoir (note de crédit) sur une facture émise (RG-9.1).
-- Une facture émise est immuable : toute correction passe par un avoir, qui
-- recopie les lignes de la facture d'origine en quantités négatives. Pas de
-- remboursement réel (garde-fou MVP) : l'avoir est un document comptable.

create or replace function public.rpc_creer_avoir(
  p_facture_id uuid,
  p_motif text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_fac public.factures;
  v_numero text;
  v_avoir uuid;
  v_ht bigint;
  v_tva bigint;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  select * into v_fac from public.factures
    where id = p_facture_id and organisation_id = v_org;
  if not found then raise exception 'Facture introuvable dans votre organisation'; end if;
  if v_fac.kind <> 'facture' then raise exception 'Un avoir ne peut porter que sur une facture'; end if;
  if v_fac.statut = 'brouillon' then raise exception 'Facture en brouillon : aucun avoir nécessaire'; end if;
  if exists (select 1 from public.factures where facture_origine_id = p_facture_id and kind = 'avoir') then
    raise exception 'Un avoir existe déjà pour cette facture';
  end if;

  v_numero := public.reserver_numero(v_org, 'AVOIR', 'AV', extract(year from now())::int);

  insert into public.factures (
    organisation_id, client_id, kind, facture_origine_id, numero, statut, motif_avoir, echeance
  ) values (
    v_org, v_fac.client_id, 'avoir', p_facture_id, v_numero, 'brouillon',
    nullif(btrim(coalesce(p_motif, '')), ''), current_date
  ) returning id into v_avoir;

  insert into public.facture_lignes (organisation_id, facture_id, designation, quantite, pu_ht_cents, tva_taux, ordre)
    select organisation_id, v_avoir, designation, -quantite, pu_ht_cents, tva_taux, ordre
    from public.facture_lignes where facture_id = p_facture_id;

  select coalesce(sum(pu_ht_cents * quantite), 0),
         coalesce(sum(round(pu_ht_cents * quantite * tva_taux / 100.0)), 0)
    into v_ht, v_tva
    from public.facture_lignes where facture_id = v_avoir;
  update public.factures
    set total_ht_cents = v_ht, total_tva_cents = v_tva, total_ttc_cents = v_ht + v_tva
    where id = v_avoir;

  update public.factures set statut = 'emise', emise_le = now() where id = v_avoir;

  return jsonb_build_object('avoir_id', v_avoir, 'numero', v_numero, 'ttc_cents', v_ht + v_tva);
end $$;

grant execute on function public.rpc_creer_avoir to authenticated;
