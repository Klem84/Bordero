-- Durcissement (audit sécurité) : contrôle de rôle bureau (admin/exploitation)
-- sur les RPC SECURITY DEFINER qui écrivent dans des tables réservées au bureau.
-- Les RPC contournant la RLS, le rôle doit être vérifié dans la fonction. Aligné
-- sur les politiques d'écriture des tables. Définitions exactes + garde inséré
-- après le contrôle d'organisation. L'app chauffeur n'appelle aucune de ces RPC.
-- + search_path explicite sur le trigger d'audit.

alter function public.audit_trigger() set search_path = public;

CREATE OR REPLACE FUNCTION public.rpc_affecter_intervention(p_intervention_id uuid, p_date date, p_camion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_tournee uuid;
  v_status public.intervention_status;
  v_next int;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  select status into v_status from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if not found then
    raise exception 'Intervention introuvable dans votre organisation';
  end if;
  if v_status not in ('BROUILLON', 'PLANIFIEE') then
    raise exception 'Seule une intervention à planifier peut être affectée (état %)', v_status;
  end if;

  if not exists (
    select 1 from public.camions where id = p_camion_id and organisation_id = v_org
  ) then
    raise exception 'Camion introuvable dans votre organisation';
  end if;

  -- Tournée jour × camion (unique par organisation).
  select id into v_tournee from public.tournees
    where organisation_id = v_org and camion_id = p_camion_id and date_tournee = p_date;
  if v_tournee is null then
    insert into public.tournees (organisation_id, camion_id, date_tournee)
      values (v_org, p_camion_id, p_date)
      returning id into v_tournee;
  end if;

  select coalesce(max(ordre_passage), 0) + 1 into v_next
    from public.interventions where tournee_id = v_tournee;

  if v_status = 'BROUILLON' then
    update public.interventions set status = 'PLANIFIEE' where id = p_intervention_id;
  end if;

  update public.interventions
    set tournee_id = v_tournee, camion_id = p_camion_id, date_prevue = p_date, ordre_passage = v_next
    where id = p_intervention_id;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_avancer_relance(p_relance_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_rel public.relances;
  v_next text;
  v_delai integer;
  v_new uuid;
  v_nom text;
  v_type_ouvrage text;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  select * into v_rel from public.relances
    where id = p_relance_id and organisation_id = v_org;
  if not found then raise exception 'Relance introuvable dans votre organisation'; end if;
  if v_rel.statut <> 'planifiee' then
    raise exception 'Seule une relance planifiée peut être avancée (statut %)', v_rel.statut;
  end if;

  v_next := case v_rel.type
    when 'recurrence_R1' then 'recurrence_R2'
    when 'recurrence_R2' then 'recurrence_R3'
    else null
  end;

  -- Étape courante traitée (sans résultat positif : on escalade).
  update public.relances set statut = 'traitee', envoye_le = now() where id = p_relance_id;

  -- Solde la tâche bureau liée à l'ouvrage de cette étape.
  if v_rel.cible_id is not null then
    update public.taches set statut = 'faite'
      where organisation_id = v_org and type = 'relance' and lien_type = 'ouvrage'
        and lien_id = v_rel.cible_id and statut = 'a_faire';
  end if;

  if v_next is null then
    return jsonb_build_object('next', null, 'final', true);
  end if;

  v_delai := public.bordero_delai_relance(v_rel.type);

  insert into public.relances (
    organisation_id, client_id, type, cible_type, cible_id, canal, statut, planifie_le
  ) values (
    v_org, v_rel.client_id, v_next, v_rel.cible_type, v_rel.cible_id, v_rel.canal,
    'planifiee', now() + make_interval(days => v_delai)
  ) returning id into v_new;

  -- Nouvelle tâche bureau à l'échéance de l'étape suivante.
  if v_rel.cible_id is not null then
    select cl.nom, o.type::text into v_nom, v_type_ouvrage
      from public.ouvrages o
      join public.sites s on s.id = o.site_id
      join public.clients cl on cl.id = s.client_id
      where o.id = v_rel.cible_id;
    insert into public.taches (organisation_id, type, libelle, statut, echeance, lien_type, lien_id)
    values (
      v_org, 'relance',
      'Relance ' || replace(v_next, 'recurrence_', '') || ' — ' || coalesce(v_nom, 'client')
        || ' (' || coalesce(v_type_ouvrage, 'ouvrage') || ')',
      'a_faire', (now() + make_interval(days => v_delai))::date, 'ouvrage', v_rel.cible_id
    );
  end if;

  return jsonb_build_object('next', v_next, 'final', false, 'relance_id', v_new);
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_clore_intervention(p_intervention_id uuid, p_exutoire_id uuid DEFAULT NULL::uuid, p_quantite_m3 numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_int public.interventions;
  v_classif public.dechet_classification;
  v_type public.bordereau_type;
  v_prefix text;
  v_type_doc text;
  v_numero text;
  v_agrement uuid;
  v_bordereau_id uuid;
  v_nature text;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  select * into v_int from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if not found then
    raise exception 'Intervention introuvable dans votre organisation';
  end if;

  -- Avance l'intervention jusqu'à TERMINEE via des transitions valides (RG-3.1).
  if v_int.status = 'BROUILLON' then
    update public.interventions set status = 'PLANIFIEE' where id = p_intervention_id;
    v_int.status := 'PLANIFIEE';
  end if;
  if v_int.status = 'PLANIFIEE' then
    update public.interventions set status = 'EN_ROUTE' where id = p_intervention_id;
    v_int.status := 'EN_ROUTE';
  end if;
  if v_int.status = 'EN_ROUTE' then
    update public.interventions set status = 'SUR_SITE' where id = p_intervention_id;
    v_int.status := 'SUR_SITE';
  end if;
  if v_int.status = 'SUR_SITE' then
    update public.interventions set status = 'TERMINEE', terminee_a = now() where id = p_intervention_id;
  elsif v_int.status <> 'TERMINEE' then
    raise exception 'Intervention dans un état non clôturable (%)', v_int.status;
  end if;

  -- Classification (depuis le premier ouvrage relevé, sinon défaut ANC).
  select classification_dechet into v_classif
    from public.intervention_ouvrages
    where intervention_id = p_intervention_id
    order by created_at asc limit 1;
  v_classif := coalesce(v_classif, 'MATIERES_VIDANGE_ANC');

  -- Routage documentaire (RG-8.1).
  if v_classif = 'MATIERES_VIDANGE_ANC' then
    v_type := 'BSMV'; v_prefix := 'BSMV'; v_type_doc := 'BSMV'; v_nature := 'Matières de vidange ANC';
  elsif v_classif = 'DECHET_DANGEREUX' then
    v_type := 'BSDD'; v_prefix := 'BSDD'; v_type_doc := 'BSDD'; v_nature := 'Déchet dangereux';
  else
    v_type := 'BON_PRESTATION'; v_prefix := 'BP'; v_type_doc := 'BON_PRESTATION'; v_nature := 'Déchet non dangereux';
  end if;

  v_numero := public.reserver_numero(v_org, v_type_doc, v_prefix, extract(year from now())::int);

  -- Agrément actif du département (best effort).
  select id into v_agrement from public.agrements
    where organisation_id = v_org and statut = 'actif' limit 1;

  insert into public.bordereaux (
    organisation_id, intervention_id, exutoire_id, agrement_id, type, numero, statut,
    nature_matiere, quantite_pompee_m3
  ) values (
    v_org, p_intervention_id, p_exutoire_id, v_agrement, v_type, v_numero, 'EMIS',
    v_nature, p_quantite_m3
  ) returning id into v_bordereau_id;

  return jsonb_build_object('bordereau_id', v_bordereau_id, 'numero', v_numero, 'type', v_type::text);
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_creer_avoir(p_facture_id uuid, p_motif text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

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
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_creer_ouvrage(p_site_id uuid, p_type ouvrage_type, p_volume integer DEFAULT NULL::integer, p_periodicite_mois integer DEFAULT NULL::integer, p_date_derniere date DEFAULT NULL::date, p_localisation text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_ouvrage uuid;
  v_echeance date;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if not exists (select 1 from public.sites where id = p_site_id and organisation_id = v_org) then
    raise exception 'Site introuvable dans votre organisation';
  end if;

  if p_date_derniere is not null and p_periodicite_mois is not null then
    v_echeance := p_date_derniere + make_interval(months => p_periodicite_mois);
  end if;

  insert into public.ouvrages (
    organisation_id, site_id, type, volume_nominal_litres, periodicite_mois,
    date_derniere_intervention, date_prochaine_echeance, localisation
  ) values (
    v_org, p_site_id, p_type, p_volume, p_periodicite_mois,
    p_date_derniere, v_echeance, nullif(btrim(coalesce(p_localisation, '')), '')
  ) returning id into v_ouvrage;
  return v_ouvrage;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_creer_relance_recurrence(p_ouvrage_id uuid, p_canal canal_contact DEFAULT 'telephone'::canal_contact)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_client uuid;
  v_nom text;
  v_type text;
  v_rel uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  select cl.id, cl.nom, o.type::text into v_client, v_nom, v_type
    from public.ouvrages o
    join public.sites s on s.id = o.site_id
    join public.clients cl on cl.id = s.client_id
    where o.id = p_ouvrage_id and o.organisation_id = v_org;
  if not found then raise exception 'Ouvrage introuvable dans votre organisation'; end if;

  insert into public.relances (
    organisation_id, client_id, type, cible_type, cible_id, canal, statut, planifie_le
  ) values (
    v_org, v_client, 'recurrence_R1', 'ouvrage', p_ouvrage_id, p_canal, 'planifiee', now()
  ) returning id into v_rel;

  insert into public.taches (
    organisation_id, type, libelle, statut, echeance, lien_type, lien_id
  ) values (
    v_org, 'relance', 'Relancer ' || v_nom || ' — entretien ' || v_type,
    'a_faire', current_date, 'ouvrage', p_ouvrage_id
  );

  return v_rel;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_creer_site(p_client_id uuid, p_adresse text, p_lng numeric DEFAULT NULL::numeric, p_lat numeric DEFAULT NULL::numeric, p_instructions_acces text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_site uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if coalesce(btrim(p_adresse), '') = '' then raise exception 'L''adresse du site est obligatoire'; end if;
  if not exists (select 1 from public.clients where id = p_client_id and organisation_id = v_org) then
    raise exception 'Client introuvable dans votre organisation';
  end if;

  insert into public.sites (organisation_id, client_id, adresse, geom, instructions_acces)
  values (
    v_org, p_client_id, p_adresse,
    case when p_lng is not null and p_lat is not null
      then ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) end,
    nullif(btrim(coalesce(p_instructions_acces, '')), '')
  ) returning id into v_site;
  return v_site;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_deplacer_intervention(p_intervention_id uuid, p_sens integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_tournee uuid;
  v_ordre int;
  v_other_id uuid;
  v_other_ordre int;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  select tournee_id, ordre_passage into v_tournee, v_ordre
    from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if not found or v_tournee is null or v_ordre is null then
    return;
  end if;

  if p_sens < 0 then
    select id, ordre_passage into v_other_id, v_other_ordre from public.interventions
      where tournee_id = v_tournee and ordre_passage < v_ordre
      order by ordre_passage desc limit 1;
  else
    select id, ordre_passage into v_other_id, v_other_ordre from public.interventions
      where tournee_id = v_tournee and ordre_passage > v_ordre
      order by ordre_passage asc limit 1;
  end if;

  if v_other_id is null then
    return;
  end if;

  update public.interventions set ordre_passage = v_other_ordre where id = p_intervention_id;
  update public.interventions set ordre_passage = v_ordre where id = v_other_id;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_desaffecter_intervention(p_intervention_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  update public.interventions
    set tournee_id = null, camion_id = null, date_prevue = null, ordre_passage = null
    where id = p_intervention_id and organisation_id = v_org
      and status in ('BROUILLON', 'PLANIFIEE');
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_facturer_intervention(p_intervention_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

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
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_generer_relances_dues()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_count integer := 0;
  r record;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  for r in
    select o.id as ouvrage_id, cl.id as client_id, cl.nom, o.type::text as type_ouvrage
    from public.ouvrages o
    join public.sites s on s.id = o.site_id
    join public.clients cl on cl.id = s.client_id
    where o.organisation_id = v_org
      and o.actif
      and o.date_prochaine_echeance is not null
      and o.date_prochaine_echeance < current_date
      and not exists (
        select 1 from public.relances rel
        where rel.cible_id = o.id and rel.type like 'recurrence%' and rel.statut = 'planifiee'
      )
  loop
    insert into public.relances (
      organisation_id, client_id, type, cible_type, cible_id, canal, statut, planifie_le
    ) values (
      v_org, r.client_id, 'recurrence_R1', 'ouvrage', r.ouvrage_id, 'telephone', 'planifiee', now()
    );
    insert into public.taches (organisation_id, type, libelle, statut, echeance, lien_type, lien_id)
    values (
      v_org, 'relance', 'Relancer ' || coalesce(r.nom, 'client') || ' — entretien ' || coalesce(r.type_ouvrage, 'ouvrage'),
      'a_faire', current_date, 'ouvrage', r.ouvrage_id
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_marquer_relance(p_relance_id uuid, p_statut text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_ouvrage uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if p_statut not in ('traitee', 'annulee') then
    raise exception 'Statut de relance invalide : %', p_statut;
  end if;

  update public.relances
    set statut = p_statut,
        envoye_le = case when p_statut = 'traitee' then now() else envoye_le end
    where id = p_relance_id and organisation_id = v_org
    returning cible_id into v_ouvrage;
  if not found then raise exception 'Relance introuvable dans votre organisation'; end if;

  -- Solde la tâche bureau associée à cet ouvrage le cas échéant.
  if v_ouvrage is not null then
    update public.taches
      set statut = 'faite'
      where organisation_id = v_org and type = 'relance'
        and lien_type = 'ouvrage' and lien_id = v_ouvrage and statut = 'a_faire';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_modifier_ouvrage(p_ouvrage_id uuid, p_type ouvrage_type, p_volume integer DEFAULT NULL::integer, p_periodicite_mois integer DEFAULT NULL::integer, p_date_derniere date DEFAULT NULL::date, p_localisation text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_echeance date;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  if p_date_derniere is not null and p_periodicite_mois is not null then
    v_echeance := p_date_derniere + make_interval(months => p_periodicite_mois);
  end if;

  update public.ouvrages set
    type = p_type,
    volume_nominal_litres = p_volume,
    periodicite_mois = p_periodicite_mois,
    date_derniere_intervention = p_date_derniere,
    date_prochaine_echeance = v_echeance,
    localisation = nullif(btrim(coalesce(p_localisation, '')), '')
  where id = p_ouvrage_id and organisation_id = v_org;
  if not found then raise exception 'Ouvrage introuvable dans votre organisation'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_modifier_site(p_site_id uuid, p_adresse text, p_lng numeric DEFAULT NULL::numeric, p_lat numeric DEFAULT NULL::numeric, p_instructions_acces text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if coalesce(btrim(p_adresse), '') = '' then raise exception 'L''adresse du site est obligatoire'; end if;

  update public.sites set
    adresse = p_adresse,
    geom = case when p_lng is not null and p_lat is not null
      then ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) else geom end,
    instructions_acces = nullif(btrim(coalesce(p_instructions_acces, '')), '')
  where id = p_site_id and organisation_id = v_org;
  if not found then raise exception 'Site introuvable dans votre organisation'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_optimiser_tournee(p_tournee_id uuid, p_ordre uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_attendu int;
  v_fourni int;
  v_intersection int;
  v_id uuid;
  v_pos int := 0;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;

  -- La tournée doit appartenir à l'organisation.
  if not exists (
    select 1 from public.tournees where id = p_tournee_id and organisation_id = v_org
  ) then
    raise exception 'Tournée introuvable dans votre organisation';
  end if;

  select count(*) into v_attendu
    from public.interventions
    where tournee_id = p_tournee_id and organisation_id = v_org;

  v_fourni := coalesce(array_length(p_ordre, 1), 0);

  -- L'ordre fourni doit couvrir exactement les interventions de la tournée.
  select count(*) into v_intersection
    from public.interventions
    where tournee_id = p_tournee_id
      and organisation_id = v_org
      and id = any(p_ordre);

  if v_fourni <> v_attendu or v_intersection <> v_attendu then
    raise exception 'Ordre invalide : il doit couvrir exactement les % interventions de la tournée', v_attendu;
  end if;

  -- Réécriture des positions (1..n) dans l'ordre fourni.
  foreach v_id in array p_ordre loop
    v_pos := v_pos + 1;
    update public.interventions
      set ordre_passage = v_pos
      where id = v_id and tournee_id = p_tournee_id and organisation_id = v_org;
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_supprimer_ouvrage(p_ouvrage_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  delete from public.ouvrages where id = p_ouvrage_id and organisation_id = v_org;
  if not found then raise exception 'Ouvrage introuvable dans votre organisation'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.rpc_supprimer_site(p_site_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if exists (select 1 from public.interventions where site_id = p_site_id) then
    raise exception 'Ce site porte des interventions : suppression interdite';
  end if;
  delete from public.sites where id = p_site_id and organisation_id = v_org;
  if not found then raise exception 'Site introuvable dans votre organisation'; end if;
end $function$;
