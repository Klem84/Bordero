-- Durcissement (revue de sécurité lot 2) : rpc_traiter_demande est SECURITY
-- DEFINER et contournait donc la politique d'écriture de la table
-- demandes_reservation (réservée à admin/exploitation). Sans contrôle de rôle
-- dans la fonction, un rôle non-bureau de la même organisation (ex. chauffeur)
-- pouvait changer le statut d'une demande. On aligne la RPC sur la politique
-- d'écriture de la table. Impact intra-tenant uniquement, corrigé par cohérence.

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
  if public.current_app_role() not in ('admin', 'exploitation') then
    raise exception 'Action réservée au bureau (admin/exploitation)';
  end if;
  if p_statut not in ('nouvelle', 'traitee', 'rejetee') then
    raise exception 'Statut invalide';
  end if;
  update public.demandes_reservation
    set statut = p_statut
    where id = p_id and organisation_id = v_org;
end $$;

grant execute on function public.rpc_traiter_demande to authenticated;
