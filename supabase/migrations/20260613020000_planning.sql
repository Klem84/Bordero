-- M2 — Planning / dispatch (CDC §5).
-- Vue de lecture enrichie pour l'écran de planning + RPC d'affectation jour×camion
-- et de réordonnancement de l'ordre de passage. Toutes les écritures restent
-- cloisonnées par organisation (current_org_id()), comme le reste du domaine.

-- ============================================================
-- Vue de planning (security_invoker : la RLS des tables sous-jacentes s'applique)
-- ============================================================
create or replace view public.v_planning_interventions
with (security_invoker = on) as
select
  i.id,
  i.organisation_id,
  i.status,
  i.date_prevue,
  i.fenetre,
  i.heure_precise,
  i.ordre_passage,
  i.urgence,
  i.tournee_id,
  i.camion_id,
  i.site_id,
  s.adresse                                            as site_adresse,
  cl.nom                                               as client_nom,
  cl.type                                              as client_type,
  pl.label                                             as prestation_label,
  coalesce(i.duree_estimee_min, pl.duree, 60)          as duree_min,
  ouv.type                                             as ouvrage_type,
  coalesce(pl.volume_m3, ouv.volume_nominal_litres / 1000.0) as volume_estime_m3
from public.interventions i
join public.sites s on s.id = i.site_id
join public.clients cl on cl.id = s.client_id
left join lateral (
  select
    string_agg(distinct ligne.designation, ', ')      as label,
    sum(coalesce(p.duree_standard_min, 60))           as duree,
    nullif(sum(coalesce(p.volume_forfait_m3, 0)), 0)  as volume_m3
  from public.commande_lignes ligne
  left join public.prestations p on p.id = ligne.prestation_id
  where ligne.commande_id = i.commande_id
) pl on true
left join lateral (
  select o.type, o.volume_nominal_litres
  from public.intervention_ouvrages io
  join public.ouvrages o on o.id = io.ouvrage_id
  where io.intervention_id = i.id
  order by io.created_at asc
  limit 1
) ouv on true;

grant select on public.v_planning_interventions to authenticated;

-- ============================================================
-- Affecter une intervention à un jour et un camion (find-or-create tournée).
-- BROUILLON -> PLANIFIEE le cas échéant ; ordre de passage = fin de file.
-- ============================================================
create or replace function public.rpc_affecter_intervention(
  p_intervention_id uuid,
  p_date date,
  p_camion_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
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
end $$;

grant execute on function public.rpc_affecter_intervention to authenticated;

-- ============================================================
-- Désaffecter (retour en file d'attente). Conserve l'état PLANIFIEE.
-- ============================================================
create or replace function public.rpc_desaffecter_intervention(
  p_intervention_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  update public.interventions
    set tournee_id = null, camion_id = null, date_prevue = null, ordre_passage = null
    where id = p_intervention_id and organisation_id = v_org
      and status in ('BROUILLON', 'PLANIFIEE');
end $$;

grant execute on function public.rpc_desaffecter_intervention to authenticated;

-- ============================================================
-- Déplacer dans l'ordre de passage (échange avec le voisin ; p_sens = -1 ou +1).
-- ============================================================
create or replace function public.rpc_deplacer_intervention(
  p_intervention_id uuid,
  p_sens int
) returns void
language plpgsql
security definer
set search_path = public
as $$
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
end $$;

grant execute on function public.rpc_deplacer_intervention to authenticated;
