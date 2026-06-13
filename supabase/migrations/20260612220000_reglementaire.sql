-- Objets réglementaires (CDC §8, §9) : bordereaux, factures, paiements, numérotation,
-- immuabilité (append-only), relances, notifications, tâches, file de jobs.

-- ============================================================
-- Enums
-- ============================================================
create type public.bordereau_type as enum ('BSMV', 'BSDD', 'BON_PRESTATION');
create type public.bordereau_statut as enum ('EMIS', 'SIGNE_CLIENT', 'DEPOSE', 'BOUCLE', 'ANNULE');
create type public.signataire_role as enum ('proprietaire', 'vidangeur', 'filiere');
create type public.facture_kind as enum ('facture', 'avoir');
create type public.facture_statut as enum (
  'brouillon', 'emise', 'envoyee', 'payee', 'partiellement_payee', 'en_retard', 'irrecouvrable'
);
create type public.paiement_mode as enum ('cb', 'lien_sms', 'virement', 'cheque', 'especes');

-- ============================================================
-- Numérotation continue (RG-8.3) : compteurs verrouillés par upsert.
-- ============================================================
create table public.compteurs (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  type_doc text not null,
  annee integer not null,
  dernier_numero integer not null default 0,
  primary key (organisation_id, type_doc, annee)
);

-- Renvoie le prochain numéro séquentiel continu (verrou par ligne via upsert).
create or replace function public.prochain_numero(p_org uuid, p_type text, p_annee integer)
returns integer language plpgsql as $$
declare
  n integer;
begin
  insert into public.compteurs (organisation_id, type_doc, annee, dernier_numero)
    values (p_org, p_type, p_annee, 1)
  on conflict (organisation_id, type_doc, annee)
    do update set dernier_numero = public.compteurs.dernier_numero + 1
  returning dernier_numero into n;
  return n;
end $$;

-- Renvoie un numéro formaté, ex. BSMV-2026-00001.
create or replace function public.reserver_numero(p_org uuid, p_type text, p_prefix text, p_annee integer)
returns text language plpgsql as $$
declare
  n integer;
begin
  n := public.prochain_numero(p_org, p_type, p_annee);
  return p_prefix || '-' || p_annee::text || '-' || lpad(n::text, 5, '0');
end $$;

-- Plages de numéros pré-allouées (hors-ligne, par camion et par jour — A2/RG-8.3).
create table public.plages_numeros (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  camion_id uuid not null references public.camions (id) on delete cascade,
  jour date not null,
  type_doc text not null default 'BSMV',
  debut integer not null,
  fin integer not null,
  consommes integer[] not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_plages_camion_jour on public.plages_numeros (organisation_id, camion_id, jour);

-- ============================================================
-- Bordereaux (objet réglementaire central, immuable une fois bouclé)
-- ============================================================
create table public.bordereaux (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  intervention_id uuid references public.interventions (id) on delete set null,
  exutoire_id uuid references public.exutoires (id) on delete set null,
  agrement_id uuid references public.agrements (id) on delete set null,
  type public.bordereau_type not null,
  numero text not null,
  statut public.bordereau_statut not null default 'EMIS',
  nature_matiere text,
  quantite_pompee_m3 numeric(8, 2),
  quantite_depotee_m3 numeric(8, 2),
  pdf_url text,
  pdf_sha256 text,
  emis_le timestamptz not null default now(),
  signe_client_le timestamptz,
  depose_le timestamptz,
  boucle_le timestamptz,
  annule_le timestamptz,
  motif_annulation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organisation_id, numero)
);
create index idx_bordereaux_org_created on public.bordereaux (organisation_id, created_at);
create index idx_bordereaux_intervention on public.bordereaux (intervention_id);
create trigger trg_bordereaux_updated before update on public.bordereaux
  for each row execute function public.set_updated_at();
create trigger trg_bordereaux_audit
  after insert or update or delete on public.bordereaux
  for each row execute function public.audit_trigger();

create table public.bordereau_signatures (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  bordereau_id uuid not null references public.bordereaux (id) on delete cascade,
  role public.signataire_role not null,
  nom text,
  signature_url text,
  gps geometry (Point, 4326),
  signe_le timestamptz not null default now()
);
create index idx_bordereau_signatures_bord on public.bordereau_signatures (bordereau_id);

-- Immuabilité du bordereau (RG-2.1, RG-8.x).
create or replace function public.enforce_bordereau_immutable()
returns trigger language plpgsql as $$
declare
  ok boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'Suppression interdite d''un bordereau (RG-2.1) : utiliser le statut ANNULE'
      using errcode = 'check_violation';
  end if;
  if old.statut in ('BOUCLE', 'ANNULE') then
    raise exception 'Bordereau % immuable (statut %)', old.numero, old.statut
      using errcode = 'check_violation';
  end if;
  if new.statut is distinct from old.statut then
    ok := case old.statut
      when 'EMIS' then new.statut in ('SIGNE_CLIENT', 'ANNULE')
      when 'SIGNE_CLIENT' then new.statut in ('DEPOSE', 'ANNULE')
      when 'DEPOSE' then new.statut in ('BOUCLE', 'ANNULE')
      else false
    end;
    if not ok then
      raise exception 'Transition bordereau illégale : % -> %', old.statut, new.statut
        using errcode = 'check_violation';
    end if;
    if new.statut = 'ANNULE' and coalesce(new.motif_annulation, '') = '' then
      raise exception 'Annulation d''un bordereau : motif obligatoire' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger trg_bordereaux_immutable before update or delete on public.bordereaux
  for each row execute function public.enforce_bordereau_immutable();

-- ============================================================
-- Factures, lignes, avoirs, paiements
-- ============================================================
create table public.factures (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  intervention_id uuid references public.interventions (id) on delete set null,
  kind public.facture_kind not null default 'facture',
  facture_origine_id uuid references public.factures (id) on delete set null, -- pour un avoir
  numero text,
  statut public.facture_statut not null default 'brouillon',
  total_ht_cents bigint not null default 0,
  total_tva_cents bigint not null default 0,
  total_ttc_cents bigint not null default 0,
  echeance date,
  emise_le timestamptz,
  motif_avoir text,
  pdf_url text,
  pdf_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organisation_id, numero)
);
create index idx_factures_org on public.factures (organisation_id, created_at);
create index idx_factures_client on public.factures (client_id);
create trigger trg_factures_updated before update on public.factures
  for each row execute function public.set_updated_at();
create trigger trg_factures_audit
  after insert or update or delete on public.factures
  for each row execute function public.audit_trigger();

create table public.facture_lignes (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  facture_id uuid not null references public.factures (id) on delete cascade,
  designation text not null,
  quantite numeric(10, 2) not null default 1,
  pu_ht_cents bigint not null default 0,
  tva_taux numeric(4, 2) not null default 20.0,
  ordre integer not null default 0
);
create index idx_facture_lignes_facture on public.facture_lignes (facture_id);

create table public.paiements (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  facture_id uuid not null references public.factures (id) on delete cascade,
  mode public.paiement_mode not null,
  montant_cents bigint not null,
  reference text,
  stripe_payment_intent text,
  rapproche boolean not null default false,
  recu_le timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_paiements_facture on public.paiements (facture_id);

-- Immuabilité des factures émises (RG-9.1) : modification/suppression via avoir uniquement.
create or replace function public.enforce_facture_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.statut <> 'brouillon' then
      raise exception 'Facture % émise : suppression interdite (RG-9.1), passer par un avoir', old.numero
        using errcode = 'check_violation';
    end if;
    return old;
  end if;
  if old.statut <> 'brouillon' then
    if new.total_ht_cents is distinct from old.total_ht_cents
      or new.total_ttc_cents is distinct from old.total_ttc_cents
      or new.total_tva_cents is distinct from old.total_tva_cents
      or new.client_id is distinct from old.client_id
      or new.numero is distinct from old.numero then
      raise exception 'Facture % émise : non modifiable (RG-9.1), passer par un avoir', old.numero
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger trg_factures_immutable before update or delete on public.factures
  for each row execute function public.enforce_facture_immutable();

-- Verrou des lignes quand la facture n'est plus en brouillon.
create or replace function public.enforce_facture_lignes_lock()
returns trigger language plpgsql as $$
declare
  v_statut public.facture_statut;
begin
  select statut into v_statut from public.factures where id = coalesce(new.facture_id, old.facture_id);
  if v_statut is distinct from 'brouillon' then
    raise exception 'Lignes verrouillées : la facture n''est plus en brouillon (RG-9.1)'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_facture_lignes_lock before insert or update or delete on public.facture_lignes
  for each row execute function public.enforce_facture_lignes_lock();

-- ============================================================
-- Relances, notifications, tâches, file de jobs (outbox)
-- ============================================================
create table public.relances (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  type text not null, -- devis / impaye / recurrence_R1/R2/R3
  cible_type text,
  cible_id uuid,
  canal public.canal_contact,
  statut text not null default 'planifiee',
  planifie_le timestamptz,
  envoye_le timestamptz,
  created_at timestamptz not null default now()
);
create index idx_relances_org on public.relances (organisation_id, planifie_le);

create table public.notifications (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  destinataire_user_id uuid references public.app_users (id) on delete cascade,
  type text not null,
  canal text not null default 'in_app',
  message text not null,
  lien_type text,
  lien_id uuid,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_dest on public.notifications (destinataire_user_id, lu);

create table public.taches (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  type text not null,
  libelle text not null,
  assignee_user_id uuid references public.app_users (id) on delete set null,
  statut text not null default 'a_faire',
  echeance date,
  lien_type text,
  lien_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_taches_org on public.taches (organisation_id, statut);
create trigger trg_taches_updated before update on public.taches
  for each row execute function public.set_updated_at();

create table public.jobs_outbox (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  type text not null, -- email / sms / pdf / webhook
  payload jsonb not null default '{}'::jsonb,
  statut text not null default 'pending', -- pending / processing / done / failed
  retries integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);
create index idx_jobs_outbox_due on public.jobs_outbox (statut, run_after);

-- ============================================================
-- RLS
-- ============================================================
alter table public.compteurs enable row level security;
alter table public.plages_numeros enable row level security;
alter table public.bordereaux enable row level security;
alter table public.bordereau_signatures enable row level security;
alter table public.factures enable row level security;
alter table public.facture_lignes enable row level security;
alter table public.paiements enable row level security;
alter table public.relances enable row level security;
alter table public.notifications enable row level security;
alter table public.taches enable row level security;
alter table public.jobs_outbox enable row level security;

-- Compteurs / plages : lecture org ; écriture serveur (service_role bypass) ; pas d'écriture client.
create policy compteurs_select on public.compteurs for select using (organisation_id = public.current_org_id());
create policy plages_select on public.plages_numeros for select using (organisation_id = public.current_org_id());
create policy plages_write on public.plages_numeros for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Bordereaux : lecture org ; écriture bureau ; le chauffeur agit sur ceux de ses interventions.
create policy bordereaux_select on public.bordereaux for select using (organisation_id = public.current_org_id());
create policy bordereaux_office on public.bordereaux for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));
create policy bordereaux_chauffeur on public.bordereaux for update
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'chauffeur'
    and exists (select 1 from public.interventions i where i.id = intervention_id and i.chauffeur_id = auth.uid()))
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'chauffeur');

create policy bord_sign_select on public.bordereau_signatures for select using (organisation_id = public.current_org_id());
create policy bord_sign_insert on public.bordereau_signatures for insert
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation', 'chauffeur'));

-- Factures / lignes : lecture org (comptable inclus) ; écriture bureau.
create policy factures_select on public.factures for select using (organisation_id = public.current_org_id());
create policy factures_write on public.factures for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy facture_lignes_select on public.facture_lignes for select using (organisation_id = public.current_org_id());
create policy facture_lignes_write on public.facture_lignes for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Paiements : lecture org ; encaissement par bureau et chauffeur (sur place).
create policy paiements_select on public.paiements for select using (organisation_id = public.current_org_id());
create policy paiements_insert on public.paiements for insert
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation', 'chauffeur'));

-- Relances / tâches : lecture + gestion bureau.
create policy relances_select on public.relances for select using (organisation_id = public.current_org_id());
create policy relances_write on public.relances for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

create policy taches_select on public.taches for select using (organisation_id = public.current_org_id());
create policy taches_write on public.taches for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));

-- Notifications : chaque utilisateur lit/marque les siennes.
create policy notifications_own on public.notifications for select
  using (organisation_id = public.current_org_id() and destinataire_user_id = auth.uid());
create policy notifications_update_own on public.notifications for update
  using (organisation_id = public.current_org_id() and destinataire_user_id = auth.uid())
  with check (organisation_id = public.current_org_id() and destinataire_user_id = auth.uid());

-- jobs_outbox : traité côté serveur (service_role). Lecture admin pour supervision.
create policy jobs_admin_select on public.jobs_outbox for select
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');
