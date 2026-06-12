-- Catalogue de prestations par organisation (CDC §5.1) : base de la prise de commande.

create table public.prestations (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  libelle text not null,
  prix_base_cents bigint not null default 0,
  majoration_urgence_pct numeric(5, 2) not null default 0,
  majoration_weekend_pct numeric(5, 2) not null default 0,
  volume_forfait_m3 numeric(6, 2),
  prix_m3_supplementaire_cents bigint,
  duree_standard_min integer not null default 60,
  classification_dechet public.dechet_classification not null default 'MATIERES_VIDANGE_ANC',
  tva_taux numeric(4, 2) not null default 20.0,
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index idx_prestations_org on public.prestations (organisation_id, actif, ordre);
create trigger trg_prestations_updated before update on public.prestations
  for each row execute function public.set_updated_at();

-- Lignes d'une commande (prestations retenues, prix figé à la prise de commande).
create table public.commande_lignes (
  id uuid primary key default public.uuid_generate_v7(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  commande_id uuid not null references public.commandes (id) on delete cascade,
  prestation_id uuid references public.prestations (id) on delete set null,
  designation text not null,
  quantite numeric(10, 2) not null default 1,
  prix_ht_cents bigint not null default 0,
  tva_taux numeric(4, 2) not null default 20.0,
  ordre integer not null default 0
);
create index idx_commande_lignes_commande on public.commande_lignes (commande_id);

alter table public.prestations enable row level security;
alter table public.commande_lignes enable row level security;

-- Catalogue / tarifs : lecture org ; écriture admin (paramétrage, CDC §2.2).
create policy prestations_select on public.prestations for select
  using (organisation_id = public.current_org_id());
create policy prestations_write on public.prestations for all
  using (organisation_id = public.current_org_id() and public.current_app_role() = 'admin')
  with check (organisation_id = public.current_org_id() and public.current_app_role() = 'admin');

-- Lignes de commande : lecture org ; écriture admin + exploitation.
create policy commande_lignes_select on public.commande_lignes for select
  using (organisation_id = public.current_org_id());
create policy commande_lignes_write on public.commande_lignes for all
  using (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'))
  with check (organisation_id = public.current_org_id() and public.current_app_role() in ('admin', 'exploitation'));
