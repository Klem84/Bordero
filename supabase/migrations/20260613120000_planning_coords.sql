-- M2 — coordonnées du site dans la vue planning (pour la carte statique de la
-- feuille de route). Recrée v_planning_interventions en ajoutant site_lng/site_lat
-- (ST_X/ST_Y du point PostGIS du site). Colonnes ajoutées : rétro-compatible.

drop view if exists public.v_planning_interventions;
create view public.v_planning_interventions
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
  ST_X(s.geom)                                         as site_lng,
  ST_Y(s.geom)                                         as site_lat,
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
