-- Socle Bordero : extensions, helpers, multi-tenant (organisations, utilisateurs, rôles),
-- journal d'audit, et hook de personnalisation du token (org_id + rôle dans le JWT).
-- Invariants : voir CLAUDE.md (multi-tenant strict, immuabilité, audit).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- UUID v7 (tri temporel naturel) — implémentation SQL en attendant le support natif.
-- ============================================================
create or replace function public.uuid_generate_v7()
returns uuid
language plpgsql
volatile
as $$
begin
  return encode(
    set_byte(
      set_byte(
        overlay(uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6),
        6, (b'0111' || get_byte(uuid_send(gen_random_uuid()), 6)::bit(4))::bit(8)::int),
      8, (b'10' || get_byte(uuid_send(gen_random_uuid()), 8)::bit(6))::bit(8)::int),
    'hex')::uuid;
end
$$;

-- ============================================================
-- Rôles applicatifs (CDC §2.2)
-- ============================================================
create type public.app_role as enum ('admin', 'exploitation', 'chauffeur', 'comptable', 'client');

-- ============================================================
-- Helper : updated_at automatique
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================
-- Organisations (le client du SaaS)
-- ============================================================
create table public.organisations (
  id uuid primary key default public.uuid_generate_v7(),
  raison_sociale text not null,
  siret text,
  adresse text,
  logo_url text,
  parametres jsonb not null default '{}'::jsonb,
  abonnement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organisations_updated before update on public.organisations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Utilisateurs applicatifs (profil métier lié à auth.users)
-- ============================================================
create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  role public.app_role not null,
  nom text,
  email text,
  telephone text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_app_users_org on public.app_users (organisation_id);
create trigger trg_app_users_updated before update on public.app_users
  for each row execute function public.set_updated_at();

-- ============================================================
-- Helpers multi-tenant : lisent les claims injectés par le hook de token
-- ============================================================
create or replace function public.current_org_id()
returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'org_id', '')::uuid
$$;

create or replace function public.current_app_role()
returns text language sql stable as $$
  select auth.jwt() ->> 'app_role'
$$;

-- ============================================================
-- Journal d'audit immuable (RG-2.1)
-- ============================================================
create table public.audit_log (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid,
  table_name text not null,
  row_id uuid,
  action text not null, -- INSERT / UPDATE / DELETE
  actor uuid, -- auth.uid()
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index idx_audit_org_at on public.audit_log (organisation_id, at desc);

-- Trigger générique d'audit, à attacher aux objets réglementaires (bordereaux, factures, agréments...).
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer as $$
declare
  v_org uuid;
  v_row uuid;
begin
  v_org := coalesce(
    (case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'organisation_id')
          else (to_jsonb(new) ->> 'organisation_id') end)::uuid,
    public.current_org_id());
  v_row := (case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')
                 else (to_jsonb(new) ->> 'id') end)::uuid;
  insert into public.audit_log (organisation_id, table_name, row_id, action, actor, before, after)
  values (
    v_org, tg_table_name, v_row, tg_op, auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ============================================================
-- Hook custom access token : injecte org_id + rôle dans le JWT
-- (à activer dans le dashboard : Authentication → Hooks → Customize Access Token)
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  v_org uuid;
  v_role text;
begin
  select organisation_id, role::text into v_org, v_role
  from public.app_users where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  if v_org is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org::text));
    claims := jsonb_set(claims, '{app_role}', to_jsonb(v_role));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on table public.app_users to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.organisations enable row level security;
alter table public.app_users enable row level security;
alter table public.audit_log enable row level security;

-- Organisations : un membre voit sa seule organisation ; seul l'admin la modifie.
create policy org_select on public.organisations for select
  using (id = public.current_org_id());
create policy org_update on public.organisations for update
  using (id = public.current_org_id() and public.current_app_role() = 'admin');

-- Utilisateurs : visibles aux membres de l'organisation ; gérés par l'admin.
create policy users_select on public.app_users for select
  using (organisation_id = public.current_org_id());
create policy users_admin_all on public.app_users for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');

-- Journal d'audit : lecture seule, réservée admin/comptable de l'organisation.
create policy audit_select on public.audit_log for select
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'comptable'));
