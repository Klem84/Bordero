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

- **Hook d'auth ACTIVÉ** automatiquement via l'API de management Supabase (access token fourni) : `org_id` et le rôle sont injectés dans les JWT. La sécurité multi-tenant est active de bout en bout. (Tu n'as plus à le faire à la main.)
- **Clés Stripe test + Supabase access token** reçues et câblées dans `.env.local`.
- **Migration 0003 — Opérations** appliquée : `devis`, `devis_lignes`, `commandes`, `tournees`, `interventions`, `intervention_ouvrages`, `intervention_events`. Machine à états de l'intervention **en base** (trigger `check_intervention_transition`, identique à packages/core). RLS multi-tenant (le chauffeur exécute ses interventions, l'exploitation gère).
- **Tests de sécurité DB** (`packages/db/scripts/test-rls.mjs`, lançable via `pnpm --filter @bordero/db test:rls`) : ✅ isolation multi-tenant RLS (org A ne voit pas org B) + ✅ machine à états (transition illégale rejetée). Tous passés.

- **Migration 0004 — Réglementaire** appliquée : `bordereaux` (+ signatures, immuabilité), `plages_numeros`, `compteurs` + fonctions `prochain_numero`/`reserver_numero` (RG-8.3), `factures` + `facture_lignes` + `paiements` (immuabilité RG-9.1, avoirs), `relances`, `notifications`, `taches`, `jobs_outbox`. Audit sur bordereaux et factures.
- **Tests de sécurité DB étendus (7/7 verts)** : isolation RLS, machine à états, numérotation continue sans trou, transition bordereau illégale rejetée, bordereau bouclé non modifiable, bordereau non supprimable.

## ✅ Sprint 1 (socle de données) : COMPLET

Schéma complet sur staging (4 migrations), multi-tenant RLS sur toutes les tables, immuabilité réglementaire, numérotation continue, machine à états en base, audit, hook d'auth actif. C'est le jalon le plus structurant : il est posé et testé.

## Sprint 2 (M1) — en cours

- **Back-office Next.js scaffolé et qui BUILD** (`apps/web`, Next 15 + React 19 + Tailwind) : routes `/login`, `/app`, `/app/clients`, middleware d'auth.
- **Auth Supabase SSR** (@supabase/ssr) : clients browser/server, middleware de session, page de connexion (Server Action), protection des routes `/app`, lecture du rôle/org depuis le JWT.
- **Layout back-office** : barre latérale (Tableau de bord, Clients, Planning, Conformité, Facturation), déconnexion, en français.
- **Tableau de bord** (6 tuiles, données à venir S8) + **liste clients** (lecture Supabase, état vide soigné).
- **Types DB générés** (`packages/db/src/types.ts`, 33 tables) via l'API hébergée (l'access token évite Docker), exposés par `@bordero/db`.
- **Module tarification** dans `packages/core` (calcul prix + majorations + TVA, CDC §5.1) avec tests. Total tests core : 17 verts.

- **Catalogue prestations** (migration 0005) + table `commande_lignes`, RLS.
- **Seed de démo** (`packages/db/scripts/seed.mjs`) : organisation « Vidanges Démo Aveyron », utilisateur admin connectable, 5 prestations, 4 clients géolocalisés avec ouvrages. **Identifiants de démo : `admin@bordero-demo.fr` / `BorderoDemo2026!`** (staging).
- **Formulaire « Nouveau client »** : Server Action + RPC `rpc_creer_client_site` (création atomique client + site avec géocodage), **autocomplétion d'adresse via API Adresse data.gouv** (écrit le `geom` PostGIS).
- **Fiche client** : synthèse + sites et ouvrages avec prochaines échéances.

- **Écran « Prise de commande rapide »** (`/app/commandes/nouvelle`) : sélection client/site/ouvrage (sites et ouvrages chargés dynamiquement), prestation, options urgence/week-end/volume, **calcul de prix HT/TVA/TTC en direct** (calculerPrixLigneCents). Server Action `creerCommande` qui **recalcule le prix côté serveur** (intégrité) et crée commande + commande_lignes + intervention (+ intervention_ouvrages). Pré-remplissage via `?client=`.
- Correctif build : `extensionAlias` webpack dans `next.config` pour résoudre les imports `.js`→`.ts` de `@bordero/core` côté client.

Reste sur M1 : CRUD sites/ouvrages depuis la fiche, SIRET pro à la création. Puis cœur réglementaire M4 (PDF BSMV/facture, registre).

## Notes techniques

- Inférence de type Supabase : `.from().select()` peut renvoyer `never` avec les types générés (quirk supabase-js connu) ; contourné par un type explicite sur la requête clients. À harmoniser (helper typé) plus tard.
- `tsconfig.base.json` a `declaration: true` (bon pour les packages lib) ; l'app web le surcharge en `declaration: false` (sinon erreur de portabilité de types).
- Variables d'env : l'app lit le `.env.local` de la racine via dotenv dans `next.config.mjs` (source unique, pas de duplication des secrets).

## Notes techniques

- Exposition REST PostgREST des nouvelles tables : peut accuser quelques minutes de retard après une migration en connexion directe (cache de schéma). Les tables existent et sont correctes ; sans impact code. Au besoin, toggle dans le dashboard (Settings → API) force le reload.

## ⚠️ Actions qui requièrent TA main (rien d'irréversible n'a été fait)

- ~~Activer le hook d'auth~~ ✅ FAIT automatiquement (access token fourni).
- Vérifier dans le dashboard Supabase (Authentication → Hooks) que « Customize Access Token » pointe bien sur `public.custom_access_token_hook` (par sécurité ; déjà activé par API).
- Comptes/clés encore non fournis (optionnels) : Sentry (DSN) et PostHog (clé EU) si tu veux le monitoring. Tout le reste est branché.

## Décisions prises en autonomie (à valider)

- Stack web : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Travail direct sur Supabase cloud staging (pas de Docker local).
- Clés UUID v7 via fonction SQL `uuid_generate_v7()`.

## Questions ouvertes pour toi

(à compléter)
