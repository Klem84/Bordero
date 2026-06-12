-- CRUD des sites et ouvrages depuis la fiche client (CDC §3, §4).
-- RPC SECURITY DEFINER : gèrent le point PostGIS des sites (impossible via PostgREST),
-- calculent l'échéance d'entretien des ouvrages (A4), et garantissent le cloisonnement
-- par organisation (l'org est dérivée du parent, jamais fournie par le client).

-- ============================================================
-- Sites
-- ============================================================
create or replace function public.rpc_creer_site(
  p_client_id uuid,
  p_adresse text,
  p_lng numeric default null,
  p_lat numeric default null,
  p_instructions_acces text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_site uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
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
end $$;

create or replace function public.rpc_modifier_site(
  p_site_id uuid,
  p_adresse text,
  p_lng numeric default null,
  p_lat numeric default null,
  p_instructions_acces text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
  if coalesce(btrim(p_adresse), '') = '' then raise exception 'L''adresse du site est obligatoire'; end if;

  update public.sites set
    adresse = p_adresse,
    geom = case when p_lng is not null and p_lat is not null
      then ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) else geom end,
    instructions_acces = nullif(btrim(coalesce(p_instructions_acces, '')), '')
  where id = p_site_id and organisation_id = v_org;
  if not found then raise exception 'Site introuvable dans votre organisation'; end if;
end $$;

create or replace function public.rpc_supprimer_site(
  p_site_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
  if exists (select 1 from public.interventions where site_id = p_site_id) then
    raise exception 'Ce site porte des interventions : suppression interdite';
  end if;
  delete from public.sites where id = p_site_id and organisation_id = v_org;
  if not found then raise exception 'Site introuvable dans votre organisation'; end if;
end $$;

-- ============================================================
-- Ouvrages (échéance = dernière intervention + périodicité, A4)
-- ============================================================
create or replace function public.rpc_creer_ouvrage(
  p_site_id uuid,
  p_type public.ouvrage_type,
  p_volume integer default null,
  p_periodicite_mois integer default null,
  p_date_derniere date default null,
  p_localisation text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_ouvrage uuid;
  v_echeance date;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
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
end $$;

create or replace function public.rpc_modifier_ouvrage(
  p_ouvrage_id uuid,
  p_type public.ouvrage_type,
  p_volume integer default null,
  p_periodicite_mois integer default null,
  p_date_derniere date default null,
  p_localisation text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_echeance date;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

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
end $$;

create or replace function public.rpc_supprimer_ouvrage(
  p_ouvrage_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
  delete from public.ouvrages where id = p_ouvrage_id and organisation_id = v_org;
  if not found then raise exception 'Ouvrage introuvable dans votre organisation'; end if;
end $$;

grant execute on function public.rpc_creer_site to authenticated;
grant execute on function public.rpc_modifier_site to authenticated;
grant execute on function public.rpc_supprimer_site to authenticated;
grant execute on function public.rpc_creer_ouvrage to authenticated;
grant execute on function public.rpc_modifier_ouvrage to authenticated;
grant execute on function public.rpc_supprimer_ouvrage to authenticated;
