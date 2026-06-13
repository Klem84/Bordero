-- RPC : création atomique client + site avec géocodage (geom PostGIS).
-- SECURITY INVOKER : la RLS et le contrôle de rôle s'appliquent selon le JWT de l'appelant.

create or replace function public.rpc_creer_client_site(
  p_type public.client_type,
  p_nom text,
  p_telephone text,
  p_email text,
  p_adresse text,
  p_lng double precision,
  p_lat double precision
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_org uuid;
  v_client uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Organisation inconnue (session non authentifiée)';
  end if;

  insert into public.clients (organisation_id, type, nom, telephone, email)
    values (v_org, p_type, p_nom, nullif(p_telephone, ''), nullif(p_email, ''))
    returning id into v_client;

  insert into public.sites (organisation_id, client_id, adresse, geom)
    values (
      v_org, v_client, p_adresse,
      case when p_lng is not null and p_lat is not null
        then ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
        else null end
    );

  return v_client;
end $$;

grant execute on function public.rpc_creer_client_site to authenticated;
