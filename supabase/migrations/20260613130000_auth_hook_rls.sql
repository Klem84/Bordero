-- Correctif : le hook custom_access_token_hook (SECURITY INVOKER, exécuté par
-- supabase_auth_admin) lit public.app_users pour injecter org_id et app_role
-- dans le JWT. Or app_users porte RLS, et ses politiques dépendent de
-- current_org_id()/current_app_role(), claims qui n'existent PAS encore au
-- moment où le jeton est forgé (problème de l'œuf et la poule). Résultat :
-- supabase_auth_admin ne voit aucune ligne, le hook n'ajoute aucun claim, et
-- toutes les données sont ensuite filtrées par RLS (application vide).
--
-- Correctif recommandé par la documentation Supabase : une politique permissive
-- qui autorise le seul rôle interne supabase_auth_admin à lire app_users, sans
-- condition. Le cloisonnement multi-tenant des rôles applicatifs (authenticated,
-- anon) reste strictement inchangé : aucune donnée n'est exposée à un locataire.

create policy "auth_admin_lecture_app_users"
  on public.app_users
  as permissive
  for select
  to supabase_auth_admin
  using (true);

-- Le hook doit pouvoir exécuter et lire ; ces droits existent déjà mais on les
-- rend explicites et idempotents pour les environnements recréés de zéro.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on table public.app_users to supabase_auth_admin;
