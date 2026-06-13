-- Lot 2 — lecture publique minimale d'une organisation par son slug, pour la
-- page de réservation (anon ne peut pas lire la table organisations sous RLS).
-- N'expose que la raison sociale et l'état d'ouverture des réservations.
create or replace function public.rpc_org_publique(p_slug text)
returns table (raison_sociale text, reservation_active boolean)
language sql
security definer
set search_path = public
as $$
  select o.raison_sociale, o.reservation_active
  from public.organisations o
  where o.slug = p_slug;
$$;

grant execute on function public.rpc_org_publique to anon, authenticated;
