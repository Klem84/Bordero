# Rapport de nuit — Bordero

Session de développement autonome du 2026-06-12 (soir) au 2026-06-13. Tout est sur la branche `auto/overnight-build` et la PR https://github.com/Klem84/Bordero/pull/1. Travail exclusivement sur le projet Supabase **staging**.

## En une phrase

Le parcours métier central de Bordero fonctionne **de bout en bout** et est démontrable avec des données de démo : **prise de commande → intervention → clôture → bordereau BSMV (PDF + numéro légal) → registre → facture (PDF) → bilan annuel préfectoral**, le tout sur une base multi-tenant sécurisée.

## Comment lancer et tester l'app (au réveil)

```bash
cd C:\Users\barbi\Documents\Bordero
corepack pnpm@9 install
corepack pnpm@9 --filter web dev
# puis ouvrir http://localhost:3000
```

- **Connexion de démo : `admin@bordero-demo.fr` / `BorderoDemo2026!`**
- Organisation de démo : « Vidanges Démo Aveyron » (agrément actif, 4 clients géolocalisés, 5 prestations, 3 bordereaux bouclés).
- Vérifier les tests : `corepack pnpm@9 -r test` (core 36, pdf 2) et `corepack pnpm@9 --filter @bordero/db test:rls` (9/9).
- Build de prod : `corepack pnpm@9 --filter web build`.

## Ce qui est fait

**Sprint 1 — Socle de données (complet)**
- 10 migrations appliquées sur staging : multi-tenant, rôles, audit, machine à états en base, immuabilité réglementaire, numérotation continue, PostGIS.
- Sécurité prouvée par tests automatisés (9/9) : isolation RLS entre organisations, transitions d'état illégales rejetées, numérotation sans trou, bordereau bouclé non modifiable/supprimable, clôture et facturation end-to-end.
- Hook d'auth actif : `org_id` et rôle dans le JWT.

**M1 — Clients & prise de commande**
- Liste/fiche clients, création avec autocomplétion d'adresse (API Adresse data.gouv) + géocodage.
- Écran « Prise de commande rapide » avec calcul de prix HT/TVA/TTC en direct (majorations urgence/week-end/volume), prix resécurisé côté serveur.

**M4 — Conformité (cœur réglementaire)**
- Clôture d'intervention → réservation d'un numéro continu → bordereau BSMV (routage RG-8.1) → **PDF 3 volets** archivé (Storage privé, SHA-256).
- Registre filtrable + export CSV + téléchargement PDF (URL signée).
- Écran Conformité : agréments avec jauge de quota (seuils 70/85/100 %), bordereaux à régulariser.
- **Bilan annuel préfectoral en 1 clic** (A3) : agrégats par commune et filière, contrôles de complétude, PDF.

**M5 — Facturation**
- Génération de facture depuis la commande (immuabilité RG-9.1), PDF, liste avec totaux, téléchargement.

**Transverse**
- Tableau de bord vivant (6 tuiles sur données réelles).
- Monorepo pnpm + Turborepo : `apps/web` (Next 15), `packages/core` (règles métier testées), `packages/db` (migrations, types, scripts), `packages/pdf` (@react-pdf).

## Ce qui reste (par ordre de valeur)

- **App mobile chauffeur (M3)** : non démarrée. C'est le gros morceau restant (Expo, offline-first, tunnel d'intervention). Nécessite un vrai téléphone pour tester.
- **Planning/dispatch (M2)** : non fait (glisser-déposer, carte). Les interventions existent mais pas l'écran d'affectation visuel.
- **Récurrence & relances (M6)** : moteur A4, écran CA dormant détaillé, portail client (lot 2).
- **Encaissement Stripe** : clés test câblées, intégration paiement à faire.
- **Trackdéchets (BSDD)** : lot 2.
- Détails : CRUD sites/ouvrages depuis la fiche, SIRET pro à la création, charte graphique, commune réelle dans le bilan (actuellement « Non précisé » faute de jointure intervention→site sur les bordereaux de démo).

## Actions qui requièrent ta main

- Rien d'irréversible n'a été fait. Tout est sur la branche `auto/overnight-build` (PR #1) : **relis et merge quand tu veux**.
- Optionnel : fournir les clés **Sentry** (DSN) et **PostHog** (clé EU) si tu veux le monitoring.
- Le hook d'auth Supabase est déjà activé (vérifiable dans Authentication → Hooks).

## Notes techniques (pour reprendre le fil)

- Migrations : `corepack pnpm@9 exec supabase db push --db-url "postgresql://postgres:<MOT_DE_PASSE_.env.local>@db.eygkjljrepqjffsmatnk.supabase.co:5432/postgres"` (le pooler régional ne marche pas, la connexion directe oui). Regénérer les types ensuite : `SUPABASE_ACCESS_TOKEN=<.env.local> corepack pnpm@9 exec supabase gen types typescript --project-id eygkjljrepqjffsmatnk --schema public > packages/db/src/types.ts` (pas `--db-url`, qui exige Docker).
- Utilitaire SQL : `node packages/db/scripts/sql.mjs "<sql>"`. Seed : `node packages/db/scripts/seed.mjs`.
- Clé `sb_secret_` : marche pour Storage et l'API admin auth, **pas** pour PostgREST (401). Écritures privilégiées via RPC SECURITY DEFINER appelée par l'utilisateur authentifié.
- Quirk supabase-js/ssr : l'inférence générique ne thread pas `Database` jusqu'aux requêtes ; on caste les résultats (`as XxxRow[]`) et les args (`as never`). À harmoniser via un helper typé.
- `next.config.mjs` : `extensionAlias` .js→.ts pour les packages internes côté client, `serverExternalPackages: ['@react-pdf/renderer']`, chargement du `.env.local` racine via dotenv.
- Secrets dans `Acces.txt` et `.env.local` (gitignorés, jamais poussés).
