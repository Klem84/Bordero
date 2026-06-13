-- Flux opérationnel (CDC §3, §5, §6, §7) : devis, commandes, tournées, interventions.
-- Machine à états de l'intervention en base (cohérente avec packages/core state-machine).

-- ============================================================
-- Enums
-- ============================================================
create type public.devis_statut as enum ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');
create type public.fenetre_horaire as enum ('matin', 'apres_midi', 'precis');
create type public.intervention_status as enum (
  'BROUILLON', 'PLANIFIEE', 'EN_ROUTE', 'SUR_SITE', 'TERMINEE', 'IMPOSSIBLE', 'CLOTUREE', 'ANNULEE'
);
create type public.tournee_statut as enum ('planifiee', 'en_cours', 'cloturee');

-- ============================================================
-- Devis
-- ============================================================
create table public.devis (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  site_id uuid references public.sites (id) on delete set null,
  numero text,
  statut public.devis_statut not null default 'brouillon',
  total_ht_cents bigint not null default 0,
  total_ttc_cents bigint not null default 0,
  validite_jusqu date,
  accepte_le timestamptz,
  signature_url text,
  token_public text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_devis_org on public.devis (organisation_id);
create index idx_devis_client on public.devis (client_id);
create trigger trg_devis_updated before update on public.devis
  for each row execute function public.set_updated_at();

create table public.devis_lignes (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  devis_id uuid not null references public.devis (id) on delete cascade,
  designation text not null,
  quantite numeric(10, 2) not null default 1,
  pu_ht_cents bigint not null default 0,
  tva_taux numeric(4, 2) not null default 20.0,
  ordre integer not null default 0
);
create index idx_devis_lignes_devis on public.devis_lignes (devis_id);

-- ============================================================
-- Commandes (devis accepté OU commande directe)
-- ============================================================
create table public.commandes (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  site_id uuid not null references public.sites (id) on delete restrict,
  devis_id uuid references public.devis (id) on delete set null,
  urgence boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_commandes_org on public.commandes (organisation_id);
create trigger trg_commandes_updated before update on public.commandes
  for each row execute function public.set_updated_at();

-- ============================================================
-- Tournées (jour × camion)
-- ============================================================
create table public.tournees (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  camion_id uuid not null references public.camions (id) on delete restrict,
  chauffeur_id uuid references public.app_users (id) on delete set null,
  date_tournee date not null,
  statut public.tournee_statut not null default 'planifiee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organisation_id, camion_id, date_tournee)
);
create index idx_tournees_org_date on public.tournees (organisation_id, date_tournee);
create trigger trg_tournees_updated before update on public.tournees
  for each row execute function public.set_updated_at();

-- ============================================================
-- Interventions (objet central — machine à états §3.3)
-- ============================================================
create table public.interventions (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  commande_id uuid references public.commandes (id) on delete set null,
  site_id uuid not null references public.sites (id) on delete restrict,
  tournee_id uuid references public.tournees (id) on delete set null,
  camion_id uuid references public.camions (id) on delete set null,
  chauffeur_id uuid references public.app_users (id) on delete set null,
  status public.intervention_status not null default 'BROUILLON',
  date_prevue date,
  fenetre public.fenetre_horaire,
  heure_precise time,
  duree_estimee_min integer,
  urgence boolean not null default false,
  ordre_passage integer,
  motif_impossible text,
  motif_annulation text,
  signature_client_url text,
  signataire_nom text,
  client_absent boolean not null default false,
  gps_arrivee geometry (Point, 4326),
  demarree_a timestamptz,
  terminee_a timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_interventions_org_date on public.interventions (organisation_id, date_prevue, camion_id);
create index idx_interventions_tournee on public.interventions (tournee_id);
create index idx_interventions_chauffeur on public.interventions (chauffeur_id);
create trigger trg_interventions_updated before update on public.interventions
  for each row execute function public.set_updated_at();

-- Relevés terrain par ouvrage (1 intervention -> n ouvrages traités)
create table public.intervention_ouvrages (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  intervention_id uuid not null references public.interventions (id) on delete cascade,
  ouvrage_id uuid references public.ouvrages (id) on delete set null,
  classification_dechet public.dechet_classification not null default 'MATIERES_VIDANGE_ANC',
  volume_pompe_m3 numeric(6, 2),
  observations text,
  recommandations jsonb not null default '[]'::jsonb,
  prochaine_vidange_conseillee date,
  created_at timestamptz not null default now()
);
create index idx_intervention_ouvrages_int on public.intervention_ouvrages (intervention_id);

-- Journal d'événements terrain (sync offline-first, preuve d'intervention)
create table public.intervention_events (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  intervention_id uuid not null references public.interventions (id) on delete cascade,
  type text not null,
  status_from public.intervention_status,
  status_to public.intervention_status,
  gps geometry (Point, 4326),
  payload jsonb not null default '{}'::jsonb,
  client_event_uuid uuid, -- idempotence de la sync (A2)
  at timestamptz not null default now()
);
create index idx_intervention_events_int on public.intervention_events (intervention_id, at);
create unique index idx_intervention_events_idem
  on public.intervention_events (organisation_id, client_event_uuid)
  where client_event_uuid is not null;

-- ============================================================
-- Machine à états en base (RG-3.1) — identique à packages/core
-- ============================================================
create or replace function public.check_intervention_transition()
returns trigger language plpgsql as $$
declare
  ok boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    ok := case old.status
      when 'BROUILLON' then new.status in ('PLANIFIEE')
      when 'PLANIFIEE' then new.status in ('EN_ROUTE', 'ANNULEE')
      when 'EN_ROUTE' then new.status in ('SUR_SITE', 'IMPOSSIBLE')
      when 'SUR_SITE' then new.status in ('TERMINEE', 'IMPOSSIBLE')
      when 'TERMINEE' then new.status in ('CLOTUREE')
      when 'IMPOSSIBLE' then new.status in ('PLANIFIEE', 'ANNULEE')
      else false
    end;
    if not ok then
      raise exception 'Transition d''intervention illégale : % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger trg_interventions_transition before update on public.interventions
  for each row execute function public.check_intervention_transition();

-- ============================================================
-- RLS
-- ============================================================
alter table public.devis enable row level security;
alter table public.devis_lignes enable row level security;
alter table public.commandes enable row level security;
alter table public.tournees enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_ouvrages enable row level security;
alter table public.intervention_events enable row level security;

-- Devis / commandes / tournées : lecture org ; écriture admin + exploitation.
create policy devis_select on public.devis for select using (organisation_id = public.current_org_id());
create policy devis_write on public.devis for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy devis_lignes_select on public.devis_lignes for select using (organisation_id = public.current_org_id());
create policy devis_lignes_write on public.devis_lignes for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy commandes_select on public.commandes for select using (organisation_id = public.current_org_id());
create policy commandes_write on public.commandes for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy tournees_select on public.tournees for select using (organisation_id = public.current_org_id());
create policy tournees_write on public.tournees for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Interventions : lecture org ; écriture admin/exploitation ; le chauffeur exécute les siennes.
create policy interventions_select on public.interventions for select using (organisation_id = public.current_org_id());
create policy interventions_office_write on public.interventions for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));
create policy interventions_chauffeur_update on public.interventions for update
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'chauffeur' and chauffeur_id = auth.uid())
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'chauffeur' and chauffeur_id = auth.uid());

-- Relevés terrain : admin/exploitation, ou le chauffeur de l'intervention.
create policy int_ouvrages_select on public.intervention_ouvrages for select using (organisation_id = public.current_org_id());
create policy int_ouvrages_write on public.intervention_ouvrages for all
  using (
    organisation_id = public.current_org_id() and (
      public.current_app_role() in ('admin', 'exploitation')
      or (public.current_app_role() = 'chauffeur' and exists (
        select 1 from public.interventions i where i.id = intervention_id and i.chauffeur_id = auth.uid()))
    )
  )
  with check (
    organisation_id = public.current_org_id() and (
      public.current_app_role() in ('admin', 'exploitation')
      or (public.current_app_role() = 'chauffeur' and exists (
        select 1 from public.interventions i where i.id = intervention_id and i.chauffeur_id = auth.uid()))
    )
  );

-- Événements terrain : insertion par les acteurs de l'org (append-only), lecture org.
create policy int_events_select on public.intervention_events for select using (organisation_id = public.current_org_id());
create policy int_events_insert on public.intervention_events for insert
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation', 'chauffeur'));
