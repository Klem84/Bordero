-- Lot 2 — Portail public de réservation (CDC lot 2).
-- Un prospect/client dépose une demande d'intervention depuis une page publique
-- (hors authentification), identifiée par le slug public de l'organisation. La
-- demande atterrit en back-office pour être convertie en client/commande.
--
-- Sécurité : aucune table n'est exposée à anon. L'insertion passe par une RPC
-- SECURITY DEFINER (rpc_creer_demande_reservation), exécutable par anon, qui
-- résout l'organisation via son slug. Le back-office (rôles bureau) lit et
-- traite les demandes, cloisonné par organisation.

-- Slug public + interrupteur de réservation sur l'organisation.
alter table public.organisations
  add column if not exists slug text,
  add column if not exists reservation_active boolean not null default true;

create unique index if not exists organisations_slug_key
  on public.organisations (slug) where slug is not null;

-- Table des demandes entrantes.
create table if not exists public.demandes_reservation (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  contact_nom text not null,
  contact_telephone text,
  contact_email text,
  adresse text,
  geom geometry (Point, 4326),
  type_ouvrage text,
  creneau_souhaite text,
  message text,
  source text not null default 'portail',
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'traitee', 'rejetee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demandes_reservation_org_statut_idx
  on public.demandes_reservation (organisation_id, statut, created_at desc);

create trigger trg_demandes_reservation_updated before update on public.demandes_reservation
  for each row execute function public.set_updated_at();

alter table public.demandes_reservation enable row level security;

-- Le bureau voit les demandes de son organisation.
create policy demandes_reservation_select on public.demandes_reservation
  for select using (organisation_id = public.current_org_id());

-- Mise à jour (statut) réservée aux rôles bureau.
create policy demandes_reservation_write on public.demandes_reservation
  for update
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Aucune policy d'INSERT ni de SELECT pour anon : l'insertion passe par la RPC.

-- ============================================================
-- Création d'une demande depuis le portail public (anon).
-- ============================================================
create or replace function public.rpc_creer_demande_reservation(
  p_slug text,
  p_nom text,
  p_telephone text,
  p_email text,
  p_adresse text,
  p_lng double precision,
  p_lat double precision,
  p_type_ouvrage text,
  p_creneau text,
  p_message text,
  p_honeypot text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
  v_geom geometry;
begin
  -- Piège anti-spam : un champ caché rempli => robot, on ignore silencieusement.
  if coalesce(p_honeypot, '') <> '' then
    return null;
  end if;
  if coalesce(btrim(p_nom), '') = '' then
    raise exception 'Le nom est obligatoire';
  end if;
  if coalesce(btrim(p_telephone), '') = '' and coalesce(btrim(p_email), '') = '' then
    raise exception 'Un téléphone ou un email est requis pour vous recontacter';
  end if;

  select id into v_org
    from public.organisations
    where slug = p_slug and reservation_active = true;
  if v_org is null then
    raise exception 'Organisation introuvable ou réservations fermées';
  end if;

  if p_lng is not null and p_lat is not null then
    v_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  end if;

  insert into public.demandes_reservation (
    organisation_id, contact_nom, contact_telephone, contact_email, adresse, geom,
    type_ouvrage, creneau_souhaite, message, source, statut
  ) values (
    v_org, btrim(p_nom), nullif(btrim(p_telephone), ''), nullif(btrim(p_email), ''),
    nullif(btrim(p_adresse), ''), v_geom, nullif(p_type_ouvrage, ''),
    nullif(btrim(p_creneau), ''), nullif(btrim(p_message), ''), 'portail', 'nouvelle'
  ) returning id into v_id;

  return v_id;
end $$;

grant execute on function public.rpc_creer_demande_reservation to anon, authenticated;

-- ============================================================
-- Traitement d'une demande par le bureau (statut).
-- ============================================================
create or replace function public.rpc_traiter_demande(
  p_id uuid,
  p_statut text
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
  if p_statut not in ('nouvelle', 'traitee', 'rejetee') then
    raise exception 'Statut invalide';
  end if;
  update public.demandes_reservation
    set statut = p_statut
    where id = p_id and organisation_id = v_org;
end $$;

grant execute on function public.rpc_traiter_demande to authenticated;

-- Slug de démo (idempotent).
update public.organisations
  set slug = 'vidanges-demo-aveyron'
  where id = 'dddddddd-0000-4000-8000-000000000001' and slug is null;
