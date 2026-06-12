-- Tables métier de base (CDC §4) : clients, sites, ouvrages, camions, exutoires, agréments.
-- Enums alignés sur packages/core (mêmes valeurs string) pour un mapping trivial.
-- RLS multi-tenant alignée sur la matrice des rôles (CDC §2.2).

create extension if not exists postgis;

-- ============================================================
-- Enums (valeurs identiques à packages/core)
-- ============================================================
create type public.client_type as enum ('particulier', 'professionnel', 'collectivite', 'syndic');
create type public.canal_contact as enum ('sms', 'email', 'telephone');
create type public.ouvrage_type as enum (
  'FOSSE_SEPTIQUE', 'FOSSE_TOUTES_EAUX', 'MICRO_STATION', 'BAC_A_GRAISSE',
  'SEPARATEUR_HYDROCARBURES', 'POSTE_RELEVAGE', 'CUVE_FIOUL', 'CANALISATION', 'AUTRE'
);
create type public.dechet_classification as enum (
  'MATIERES_VIDANGE_ANC', 'DECHET_DANGEREUX', 'DECHET_NON_DANGEREUX_HORS_ANC'
);
create type public.camion_type as enum ('hydrocureur', 'combine', 'citerne_simple', 'fourgon');
create type public.exutoire_type as enum ('station_epuration', 'centre_agree', 'epandage_autorise', 'autre');
create type public.agrement_statut as enum ('actif', 'en_renouvellement', 'expire', 'suspendu');

-- ============================================================
-- Helper : politiques RLS standard (lecture org + écriture par rôles)
-- On écrit les politiques explicitement par table (Postgres ne paramètre pas les policies).
-- ============================================================

-- ---------- Clients ----------
create table public.clients (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  type public.client_type not null default 'particulier',
  nom text not null,
  siret text,
  email text,
  telephone text,
  canal_contact public.canal_contact not null default 'sms',
  consentement_relances boolean not null default true,
  conditions_paiement text,
  encours_cents bigint not null default 0,
  exclu_relances boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_clients_org on public.clients (organisation_id);
create index idx_clients_org_nom on public.clients (organisation_id, nom);
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------- Sites (1 client -> n sites) ----------
create table public.sites (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  adresse text not null,
  geom geometry (Point, 4326),
  instructions_acces text,
  distance_pompage_m integer,
  contact_sur_place text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_sites_org on public.sites (organisation_id);
create index idx_sites_client on public.sites (client_id);
create index idx_sites_geom on public.sites using gist (geom);
create trigger trg_sites_updated before update on public.sites
  for each row execute function public.set_updated_at();

-- ---------- Ouvrages (l'objet entretenu, clé de la récurrence) ----------
create table public.ouvrages (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  type public.ouvrage_type not null,
  volume_nominal_litres integer,
  localisation text,
  photo_repere_url text,
  date_pose date,
  periodicite_mois integer,
  classification_dechet public.dechet_classification not null default 'MATIERES_VIDANGE_ANC',
  date_derniere_intervention date,
  date_prochaine_echeance date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_ouvrages_org on public.ouvrages (organisation_id);
create index idx_ouvrages_site on public.ouvrages (site_id);
create index idx_ouvrages_echeance on public.ouvrages (organisation_id, date_prochaine_echeance);
create trigger trg_ouvrages_updated before update on public.ouvrages
  for each row execute function public.set_updated_at();

-- ---------- Camions ----------
create table public.camions (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  immatriculation text not null,
  type public.camion_type not null default 'hydrocureur',
  capacite_citerne_m3 numeric(6, 2) not null,
  equipements jsonb not null default '{}'::jsonb,
  controle_technique_echeance date,
  adr_validite date,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_camions_org on public.camions (organisation_id);
create trigger trg_camions_updated before update on public.camions
  for each row execute function public.set_updated_at();

-- ---------- Exutoires (filières d'élimination) ----------
create table public.exutoires (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  raison_sociale text not null,
  siret text,
  adresse text,
  geom geometry (Point, 4326),
  type public.exutoire_type not null default 'station_epuration',
  contact_responsable text,
  tarif_depotage_m3_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_exutoires_org on public.exutoires (organisation_id);
create index idx_exutoires_geom on public.exutoires using gist (geom);
create trigger trg_exutoires_updated before update on public.exutoires
  for each row execute function public.set_updated_at();

-- ---------- Agréments préfectoraux (objet réglementaire, audité) ----------
create table public.agrements (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  departement_code text not null,
  departement_libelle text,
  numero text not null,
  date_delivrance date not null,
  date_echeance date not null,
  quantite_max_annuelle_m3 numeric(10, 2),
  filieres jsonb not null default '[]'::jsonb,
  lieux_depotage jsonb not null default '[]'::jsonb,
  arrete_pdf_url text,
  statut public.agrement_statut not null default 'actif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_agrements_org on public.agrements (organisation_id);
create index idx_agrements_org_dept on public.agrements (organisation_id, departement_code, statut);
create trigger trg_agrements_updated before update on public.agrements
  for each row execute function public.set_updated_at();
create trigger trg_agrements_audit
  after insert or update or delete on public.agrements
  for each row execute function public.audit_trigger();

-- ---------- Événements d'agrément (renouvellements, modifications) ----------
create table public.agrement_events (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  agrement_id uuid not null references public.agrements (id) on delete cascade,
  type text not null, -- renouvellement / modification / suspension ...
  date_evenement date not null default current_date,
  statut text, -- en_instruction / notifiee
  notifie_le date,
  notification_pdf_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_agrement_events_agr on public.agrement_events (agrement_id);

-- ============================================================
-- RLS : lecture pour tout membre de l'organisation ; écriture par rôles.
-- ============================================================
alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.ouvrages enable row level security;
alter table public.camions enable row level security;
alter table public.exutoires enable row level security;
alter table public.agrements enable row level security;
alter table public.agrement_events enable row level security;

-- Données opérationnelles (clients, sites, ouvrages) : écriture admin + exploitation.
create policy clients_select on public.clients for select using (organisation_id = public.current_org_id());
create policy clients_write on public.clients for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy sites_select on public.sites for select using (organisation_id = public.current_org_id());
create policy sites_write on public.sites for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy ouvrages_select on public.ouvrages for select using (organisation_id = public.current_org_id());
create policy ouvrages_write on public.ouvrages for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Paramétrage (camions, exutoires, agréments) : écriture admin uniquement (CDC §2.2).
create policy camions_select on public.camions for select using (organisation_id = public.current_org_id());
create policy camions_write on public.camions for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');

create policy exutoires_select on public.exutoires for select using (organisation_id = public.current_org_id());
create policy exutoires_write on public.exutoires for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');

create policy agrements_select on public.agrements for select using (organisation_id = public.current_org_id());
create policy agrements_write on public.agrements for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');

create policy agrement_events_select on public.agrement_events for select using (organisation_id = public.current_org_id());
create policy agrement_events_write on public.agrement_events for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');
