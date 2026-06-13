-- M3 (app chauffeur) : synchronisation d'un événement de transition terrain.
-- Le terminal est la source de vérité de l'EXÉCUTION ; le serveur arbitre les
-- conflits (algorithme A2). Idempotent par client_event_uuid (rejouer la sync
-- n'a aucun effet de bord). Logique sensible côté serveur (invariant 5).

create or replace function public.rpc_sync_evenement(
  p_intervention_id uuid,
  p_client_event_uuid uuid,
  p_status_to public.intervention_status,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_from public.intervention_status;
  v_applied boolean := false;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  -- Idempotence : si l'événement est déjà reçu, ne rien refaire.
  if exists (
    select 1 from public.intervention_events
    where organisation_id = v_org and client_event_uuid = p_client_event_uuid
  ) then
    return jsonb_build_object('deja', true);
  end if;

  select status into v_from from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if not found then raise exception 'Intervention introuvable dans votre organisation'; end if;

  -- Trace terrain (append-only), porte la clé d'idempotence.
  insert into public.intervention_events (
    organisation_id, intervention_id, type, status_from, status_to, payload, client_event_uuid
  ) values (
    v_org, p_intervention_id, 'transition', v_from, p_status_to, coalesce(p_payload, '{}'::jsonb), p_client_event_uuid
  );

  -- Applique la transition si elle est légale ; sinon on conserve l'état serveur
  -- (conflit résolu côté serveur, A2). Le sous-bloc isole l'échec du trigger.
  begin
    update public.interventions set
      status = p_status_to,
      demarree_a = case when p_status_to = 'EN_ROUTE' then coalesce(demarree_a, now()) else demarree_a end,
      terminee_a = case when p_status_to = 'TERMINEE' then now() else terminee_a end
    where id = p_intervention_id;
    v_applied := true;
  exception when others then
    v_applied := false;
  end;

  return jsonb_build_object('deja', false, 'applied', v_applied, 'from', v_from::text);
end $$;

grant execute on function public.rpc_sync_evenement to authenticated;
