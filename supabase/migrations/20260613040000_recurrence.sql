-- M6 — Récurrence : CA dormant détaillé et relances d'entretien (CDC §10, algo A4).
-- L'ouvrage est la clé de la récurrence : à échéance dépassée, son entretien est du
-- chiffre d'affaires dormant, à reconquérir par une relance.

-- ============================================================
-- Échéance d'entretien : calcul automatique quand non fournie (A4)
-- ============================================================
create or replace function public.compute_ouvrage_echeance()
returns trigger language plpgsql as $$
begin
  if new.date_prochaine_echeance is null
     and new.date_derniere_intervention is not null
     and new.periodicite_mois is not null then
    new.date_prochaine_echeance :=
      new.date_derniere_intervention + make_interval(months => new.periodicite_mois);
  end if;
  return new;
end $$;

create trigger trg_ouvrages_echeance
  before insert or update on public.ouvrages
  for each row execute function public.compute_ouvrage_echeance();

-- Backfill des ouvrages existants (seed antérieur sans échéance).
update public.ouvrages
  set date_prochaine_echeance =
    date_derniere_intervention + make_interval(months => periodicite_mois)
  where date_prochaine_echeance is null
    and date_derniere_intervention is not null
    and periodicite_mois is not null;

-- ============================================================
-- Vue récurrence (security_invoker) : ouvrages à échéance, valorisables
-- ============================================================
create or replace view public.v_recurrence_ouvrages
with (security_invoker = on) as
select
  o.id,
  o.organisation_id,
  o.type,
  (o.volume_nominal_litres / 1000.0)            as volume_m3,
  o.date_derniere_intervention,
  o.date_prochaine_echeance,
  s.id                                          as site_id,
  s.adresse                                     as site_adresse,
  cl.id                                         as client_id,
  cl.nom                                        as client_nom,
  cl.telephone                                  as client_telephone,
  cl.email                                      as client_email,
  exists (
    select 1 from public.relances r
    where r.cible_id = o.id and r.type like 'recurrence%' and r.statut = 'planifiee'
  )                                             as relance_active
from public.ouvrages o
join public.sites s on s.id = o.site_id
join public.clients cl on cl.id = s.client_id
where o.actif and o.date_prochaine_echeance is not null;

grant select on public.v_recurrence_ouvrages to authenticated;

-- ============================================================
-- Relance de récurrence : planifie une relance + crée une tâche bureau.
-- Aucun envoi réel (email/SMS) : la relance reste « planifiee » jusqu'à
-- traitement manuel (garde-fou MVP). Cloisonnée par organisation.
-- ============================================================
create or replace function public.rpc_creer_relance_recurrence(
  p_ouvrage_id uuid,
  p_canal public.canal_contact default 'telephone'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_client uuid;
  v_nom text;
  v_type text;
  v_rel uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

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
end $$;

grant execute on function public.rpc_creer_relance_recurrence to authenticated;

-- ============================================================
-- Traiter / annuler une relance (statut : traitee | annulee).
-- ============================================================
create or replace function public.rpc_marquer_relance(
  p_relance_id uuid,
  p_statut text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_ouvrage uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;
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
end $$;

grant execute on function public.rpc_marquer_relance to authenticated;
