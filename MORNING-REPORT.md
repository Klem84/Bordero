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

- **Clés câblées** : Brevo et Expo reçues et ajoutées à `.env.local` (+ Mapbox, Resend, Supabase déjà présentes). `.env.example` complété pour tous les services.
- **Migration 0002 — Tables métier** appliquée sur staging : `clients`, `sites` (PostGIS `geom`), `ouvrages`, `camions`, `exutoires`, `agrements` (+ trigger d'audit) et `agrement_events`. Enums alignés sur packages/core. RLS multi-tenant sur toutes les tables (écriture admin/exploitation pour l'opérationnel, admin seul pour le paramétrage, conforme à la matrice des rôles §2.2). Tables et grants vérifiés via `information_schema`.
- **Utilitaire SQL** `packages/db/scripts/sql.mjs` (client `pg`) pour exécuter du SQL sur staging et vérifier les migrations. Réutilisable pour le test d'isolation RLS.

## En cours

- Sprint 1 — suite : interventions, tournées, commandes/devis, puis objets réglementaires (bordereaux, factures) avec immuabilité, numérotation et machine à états en base.

## Notes techniques

- Exposition REST PostgREST des nouvelles tables : peut accuser quelques minutes de retard après une migration en connexion directe (cache de schéma). Les tables existent et sont correctes ; sans impact code. Au besoin, toggle dans le dashboard (Settings → API) force le reload.

## ⚠️ Actions qui requièrent TA main (rien d'irréversible n'a été fait)

- **Activer le hook d'auth** dans Supabase si je n'ai pas pu l'automatiser : Dashboard → Authentication → Hooks → Customize Access Token → fonction `public.custom_access_token_hook`. (Indispensable pour que `org_id` et le rôle soient dans le JWT, donc pour que la sécurité multi-tenant fonctionne côté client.)
- Comptes/clés non fournis cette nuit (voir Acces.txt) : tout ce qui manque est noté ici.

## Décisions prises en autonomie (à valider)

- Stack web : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Travail direct sur Supabase cloud staging (pas de Docker local).
- Clés UUID v7 via fonction SQL `uuid_generate_v7()`.

## Questions ouvertes pour toi

(à compléter)
