-- M3 (app chauffeur) — synchronisation d'un relevé terrain (CDC §6, algo A4).
-- Le terminal est la source de vérité de l'EXÉCUTION : volume pompé, observations,
-- prochaine vidange conseillée. Idempotent par client_event_uuid. La date conseillée
-- par le chauffeur prévaut sur l'échéance calculée de l'ouvrage (A4).

create or replace function public.rpc_sync_releve(
  p_intervention_id uuid,
  p_ouvrage_id uuid,
  p_volume_m3 numeric,
  p_observations text,
  p_prochaine_date date,
  p_client_event_uuid uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_io uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  -- Idempotence : événement déjà reçu -> ne rien refaire.
  if exists (
    select 1 from public.intervention_events
    where organisation_id = v_org and client_event_uuid = p_client_event_uuid
  ) then
    return jsonb_build_object('deja', true);
  end if;

  if not exists (
    select 1 from public.interventions where id = p_intervention_id and organisation_id = v_org
  ) then
    raise exception 'Intervention introuvable dans votre organisation';
  end if;

  -- Upsert du relevé : on cible la ligne (intervention, ouvrage) si elle existe.
  select id into v_io from public.intervention_ouvrages
    where intervention_id = p_intervention_id
      and (ouvrage_id is not distinct from p_ouvrage_id)
    order by created_at asc limit 1;

  if v_io is null then
    insert into public.intervention_ouvrages (
      organisation_id, intervention_id, ouvrage_id, volume_pompe_m3, observations, prochaine_vidange_conseillee
    ) values (
      v_org, p_intervention_id, p_ouvrage_id, p_volume_m3,
      nullif(btrim(coalesce(p_observations, '')), ''), p_prochaine_date
    ) returning id into v_io;
  else
    update public.intervention_ouvrages set
      volume_pompe_m3 = p_volume_m3,
      observations = nullif(btrim(coalesce(p_observations, '')), ''),
      prochaine_vidange_conseillee = p_prochaine_date
    where id = v_io;
  end if;

  -- Échéance de l'ouvrage : la date conseillée par le chauffeur prévaut (A4).
  if p_ouvrage_id is not null and p_prochaine_date is not null then
    update public.ouvrages
      set date_prochaine_echeance = p_prochaine_date,
          date_derniere_intervention = current_date
      where id = p_ouvrage_id and organisation_id = v_org;
  end if;

  -- Trace terrain append-only (porte la clé d'idempotence).
  insert into public.intervention_events (
    organisation_id, intervention_id, type, payload, client_event_uuid
  ) values (
    v_org, p_intervention_id, 'releve',
    jsonb_build_object('ouvrage_id', p_ouvrage_id, 'volume_m3', p_volume_m3, 'prochaine_date', p_prochaine_date),
    p_client_event_uuid
  );

  return jsonb_build_object('deja', false, 'intervention_ouvrage_id', v_io);
end $$;

grant execute on function public.rpc_sync_releve to authenticated;
