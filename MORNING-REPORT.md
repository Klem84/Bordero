# Rapport de nuit — Bordero

Ce fichier est mis à jour au fil de la session autonome. À lire au réveil.

## Résumé

Session autonome démarrée le 2026-06-12 au soir. Objectif : Sprint 1 (socle données) complet, puis avancer M1 et le cœur réglementaire. Travail sur le projet Supabase **staging** uniquement.

## Fait

- **Pipeline DB autonome validé** : application des migrations sur staging via connexion directe (`db.eygkjljrepqjffsmatnk.supabase.co:5432`, mot de passe dans `.env.local`). Pas besoin de l'access token pour les migrations.
- **Migration 0001 — Fondations** appliquée sur staging :
  - extensions, `uuid_generate_v7()`, helper `set_updated_at`.
  - `organisations`, `app_users` (rôles `admin/exploitation/chauffeur/comptable/client`).
  - `audit_log` + trigger générique d'audit (RG-2.1).
  - helpers multi-tenant `current_org_id()` / `current_app_role()` (lisent les claims JWT).
  - hook `custom_access_token_hook` (injecte org_id + rôle dans le JWT).
  - RLS activée sur les 3 tables. Vérifié : `organisations` renvoie 200 + `[]` pour un appel anonyme (la RLS filtre bien).

## En cours

- Sprint 1 — suite : tables métier (clients, sites, ouvrages, camions, agréments, exutoires), puis interventions et objets réglementaires.

## ⚠️ Actions qui requièrent TA main (rien d'irréversible n'a été fait)

- **Activer le hook d'auth** dans Supabase si je n'ai pas pu l'automatiser : Dashboard → Authentication → Hooks → Customize Access Token → fonction `public.custom_access_token_hook`. (Indispensable pour que `org_id` et le rôle soient dans le JWT, donc pour que la sécurité multi-tenant fonctionne côté client.)
- Comptes/clés non fournis cette nuit (voir Acces.txt) : tout ce qui manque est noté ici.

## Décisions prises en autonomie (à valider)

- Stack web : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Travail direct sur Supabase cloud staging (pas de Docker local).
- Clés UUID v7 via fonction SQL `uuid_generate_v7()`.

## Questions ouvertes pour toi

(à compléter)
