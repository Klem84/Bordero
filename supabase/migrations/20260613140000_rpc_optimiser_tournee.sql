-- M2 lot 2 — persiste un nouvel ordre de passage pour une tournée.
-- Le calcul 2-opt est fait côté serveur applicatif (@bordero/core) ; cette RPC
-- ne fait que réécrire ordre_passage selon l'ordre fourni, de façon cloisonnée
-- et atomique. Garde-fou : l'ordre doit couvrir exactement les interventions de
-- la tournée (mêmes identifiants, même cardinalité), sinon on rejette.

create or replace function public.rpc_optimiser_tournee(
  p_tournee_id uuid,
  p_ordre uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_attendu int;
  v_fourni int;
  v_intersection int;
  v_id uuid;
  v_pos int := 0;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  -- La tournée doit appartenir à l'organisation.
  if not exists (
    select 1 from public.tournees where id = p_tournee_id and organisation_id = v_org
  ) then
    raise exception 'Tournée introuvable dans votre organisation';
  end if;

  select count(*) into v_attendu
    from public.interventions
    where tournee_id = p_tournee_id and organisation_id = v_org;

  v_fourni := coalesce(array_length(p_ordre, 1), 0);

  -- L'ordre fourni doit couvrir exactement les interventions de la tournée.
  select count(*) into v_intersection
    from public.interventions
    where tournee_id = p_tournee_id
      and organisation_id = v_org
      and id = any(p_ordre);

  if v_fourni <> v_attendu or v_intersection <> v_attendu then
    raise exception 'Ordre invalide : il doit couvrir exactement les % interventions de la tournée', v_attendu;
  end if;

  -- Réécriture des positions (1..n) dans l'ordre fourni.
  foreach v_id in array p_ordre loop
    v_pos := v_pos + 1;
    update public.interventions
      set ordre_passage = v_pos
      where id = v_id and tournee_id = p_tournee_id and organisation_id = v_org;
  end loop;
end $$;

grant execute on function public.rpc_optimiser_tournee to authenticated;
