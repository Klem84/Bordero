-- M6 — Séquence de relances de récurrence R1 -> R2 -> R3 (CDC §10, algo A4).
-- Escalade manuelle (« sans réponse, étape suivante ») avec délai entre étapes,
-- et génération idempotente des relances dues. AUCUN envoi réel (garde-fou MVP) :
-- une relance reste « planifiee » jusqu'à traitement.

-- Délais d'escalade (jours) entre étapes.
create or replace function public.bordero_delai_relance(p_type text)
returns integer language sql immutable as $$
  select case p_type
    when 'recurrence_R1' then 14   -- avant de passer à R2
    when 'recurrence_R2' then 14   -- avant de passer à R3
    else 0
  end
$$;

-- Avance une relance à l'étape suivante : marque l'actuelle « traitee » et crée
-- l'étape suivante (planifiée à échéance = maintenant + délai). R3 est terminal.
create or replace function public.rpc_avancer_relance(
  p_relance_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_rel public.relances;
  v_next text;
  v_delai integer;
  v_new uuid;
  v_nom text;
  v_type_ouvrage text;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  select * into v_rel from public.relances
    where id = p_relance_id and organisation_id = v_org;
  if not found then raise exception 'Relance introuvable dans votre organisation'; end if;
  if v_rel.statut <> 'planifiee' then
    raise exception 'Seule une relance planifiée peut être avancée (statut %)', v_rel.statut;
  end if;

  v_next := case v_rel.type
    when 'recurrence_R1' then 'recurrence_R2'
    when 'recurrence_R2' then 'recurrence_R3'
    else null
  end;

  -- Étape courante traitée (sans résultat positif : on escalade).
  update public.relances set statut = 'traitee', envoye_le = now() where id = p_relance_id;

  -- Solde la tâche bureau liée à l'ouvrage de cette étape.
  if v_rel.cible_id is not null then
    update public.taches set statut = 'faite'
      where organisation_id = v_org and type = 'relance' and lien_type = 'ouvrage'
        and lien_id = v_rel.cible_id and statut = 'a_faire';
  end if;

  if v_next is null then
    return jsonb_build_object('next', null, 'final', true);
  end if;

  v_delai := public.bordero_delai_relance(v_rel.type);

  insert into public.relances (
    organisation_id, client_id, type, cible_type, cible_id, canal, statut, planifie_le
  ) values (
    v_org, v_rel.client_id, v_next, v_rel.cible_type, v_rel.cible_id, v_rel.canal,
    'planifiee', now() + make_interval(days => v_delai)
  ) returning id into v_new;

  -- Nouvelle tâche bureau à l'échéance de l'étape suivante.
  if v_rel.cible_id is not null then
    select cl.nom, o.type::text into v_nom, v_type_ouvrage
      from public.ouvrages o
      join public.sites s on s.id = o.site_id
      join public.clients cl on cl.id = s.client_id
      where o.id = v_rel.cible_id;
    insert into public.taches (organisation_id, type, libelle, statut, echeance, lien_type, lien_id)
    values (
      v_org, 'relance',
      'Relance ' || replace(v_next, 'recurrence_', '') || ' — ' || coalesce(v_nom, 'client')
        || ' (' || coalesce(v_type_ouvrage, 'ouvrage') || ')',
      'a_faire', (now() + make_interval(days => v_delai))::date, 'ouvrage', v_rel.cible_id
    );
  end if;

  return jsonb_build_object('next', v_next, 'final', false, 'relance_id', v_new);
end $$;

grant execute on function public.rpc_avancer_relance to authenticated;

-- Génère les relances R1 dues : pour chaque ouvrage à échéance dépassée, actif,
-- sans relance de récurrence déjà planifiée, crée une R1 + une tâche bureau.
-- Idempotent : relancer la génération ne crée pas de doublon.
create or replace function public.rpc_generer_relances_dues()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_count integer := 0;
  r record;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  for r in
    select o.id as ouvrage_id, cl.id as client_id, cl.nom, o.type::text as type_ouvrage
    from public.ouvrages o
    join public.sites s on s.id = o.site_id
    join public.clients cl on cl.id = s.client_id
    where o.organisation_id = v_org
      and o.actif
      and o.date_prochaine_echeance is not null
      and o.date_prochaine_echeance < current_date
      and not exists (
        select 1 from public.relances rel
        where rel.cible_id = o.id and rel.type like 'recurrence%' and rel.statut = 'planifiee'
      )
  loop
    insert into public.relances (
      organisation_id, client_id, type, cible_type, cible_id, canal, statut, planifie_le
    ) values (
      v_org, r.client_id, 'recurrence_R1', 'ouvrage', r.ouvrage_id, 'telephone', 'planifiee', now()
    );
    insert into public.taches (organisation_id, type, libelle, statut, echeance, lien_type, lien_id)
    values (
      v_org, 'relance', 'Relancer ' || coalesce(r.nom, 'client') || ' — entretien ' || coalesce(r.type_ouvrage, 'ouvrage'),
      'a_faire', current_date, 'ouvrage', r.ouvrage_id
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

grant execute on function public.rpc_generer_relances_dues to authenticated;
