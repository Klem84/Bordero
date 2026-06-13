-- M3 (app chauffeur) — signature / preuve d'intervention (CDC §6).
-- Le chauffeur saisit le nom du signataire sur place, ou indique le client absent.
-- Idempotent par client_event_uuid. Source de vérité de l'EXÉCUTION (terminal).

create or replace function public.rpc_sync_signature(
  p_intervention_id uuid,
  p_signataire_nom text,
  p_client_absent boolean,
  p_client_event_uuid uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then raise exception 'Session non authentifiée'; end if;

  if exists (
    select 1 from public.intervention_events
    where organisation_id = v_org and client_event_uuid = p_client_event_uuid
  ) then
    return jsonb_build_object('deja', true);
  end if;

  update public.interventions set
    signataire_nom = nullif(btrim(coalesce(p_signataire_nom, '')), ''),
    client_absent = coalesce(p_client_absent, false)
  where id = p_intervention_id and organisation_id = v_org;
  if not found then raise exception 'Intervention introuvable dans votre organisation'; end if;

  insert into public.intervention_events (
    organisation_id, intervention_id, type, payload, client_event_uuid
  ) values (
    v_org, p_intervention_id, 'signature',
    jsonb_build_object('signataire_nom', p_signataire_nom, 'client_absent', coalesce(p_client_absent, false)),
    p_client_event_uuid
  );

  return jsonb_build_object('deja', false);
end $$;

grant execute on function public.rpc_sync_signature to authenticated;
