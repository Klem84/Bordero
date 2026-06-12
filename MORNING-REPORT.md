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
- Organisation de démo : « Vidanges Démo Aveyron » (agrément actif, 4 clients géolocalisés, 5 prestations, 3 bordereaux bouclés, 3 camions, 1 exutoire, 7 interventions dont 3 en file d'attente et 4 planifiées).
- Le seed est désormais ré-exécutable à volonté (`node packages/db/scripts/seed.mjs`) même après création de bordereaux : il désactive temporairement les triggers d'immuabilité le temps du reset (connexion postgres superuser).
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

**M2 — Planning / dispatch (nuit 3)**
- Écran `/app/planning` : file d'attente des interventions à planifier (urgences en tête) et tableau par camion du jour, avec navigation par date (jour précédent/suivant, sélecteur, retour à aujourd'hui).
- Affectation jour × camion (création/réutilisation automatique de la tournée), réordonnancement de l'ordre de passage (monter/descendre), retrait vers la file. Tout passe par des RPC SECURITY DEFINER cloisonnées par organisation (`rpc_affecter`/`rpc_desaffecter`/`rpc_deplacer_intervention`).
- Chaque colonne camion affiche une jauge de remplissage de citerne (volume estimé / capacité, seuils 85/100 %) et la durée totale de la tournée.
- Vue de lecture `v_planning_interventions` (security_invoker, RLS respectée) qui agrège client, adresse, prestation, ouvrage, durée et volume estimé.
- Vérifié : build OK, tests RPC fonctionnels (affectation BROUILLON→PLANIFIEE, réordonnancement, désaffectation, rejet inter-organisations), 9/9 RLS toujours verts.

**CRUD sites & ouvrages (nuit 3)**
- Fiche client : section « Sites et ouvrages » entièrement interactive (ajout, édition, suppression de sites et d'ouvrages en ligne, avec confirmation). L'adresse d'un site est géocodée (composant `AddressAutocomplete` réutilisable, extrait du formulaire client).
- L'échéance d'entretien d'un ouvrage est calculée côté serveur (A4 : dernière intervention + périodicité), la périodicité est préremplie selon le type d'ouvrage. Les ouvrages en retard sont signalés.
- Écritures via RPC SECURITY DEFINER cloisonnées par organisation (`rpc_creer/modifier/supprimer_site` et `…_ouvrage`). Suppression d'un site refusée s'il porte des interventions (intégrité). Testé fonctionnellement (geom, échéance, garde de suppression).

**M6 — Récurrence : CA dormant & relances (nuit 3)**
- Écran `/app/recurrence` : KPI (CA dormant valorisé, installations en retard, échéances proches), tableau des installations à relancer (statut d'échéance en retard/bientôt/à jour, valeur estimée au m³, planification de relance en un clic, raccourci vers la prise de commande), et liste des relances planifiées (traiter / annuler).
- Moteur d'échéance (A4) fiabilisé : un trigger calcule `date_prochaine_echeance` (dernière intervention + périodicité) quand elle n'est pas fournie, avec backfill des ouvrages existants. La vue `v_recurrence_ouvrages` (security_invoker) agrège client, site, volume, statut et présence d'une relance active.
- Relances : RPC `rpc_creer_relance_recurrence` (planifie la relance + crée une tâche bureau) et `rpc_marquer_relance` (traitée/annulée, solde la tâche). **Aucun envoi réel d'email/SMS** (garde-fou MVP) : la relance reste « planifiée » jusqu'à traitement manuel.
- Entrée « Récurrence » dans la barre latérale ; la tuile CA dormant du tableau de bord pointe désormais vers cet écran. Seed calé pour illustrer les trois statuts d'échéance.
- Vérifié : build OK, 9/9 RLS, 36 core, RPC testés (relance + tâche, traitement, statut invalide rejeté, cloisonnement inter-organisations).

**Transverse**
- Tableau de bord vivant (6 tuiles sur données réelles).
- Monorepo pnpm + Turborepo : `apps/web` (Next 15), `packages/core` (règles métier testées), `packages/db` (migrations, types, scripts), `packages/pdf` (@react-pdf).

## Refonte design (nuit 2)

À ta demande (l'UI était « vieillotte »), refonte complète du back-office avec le skill **impeccable** + tokens OKLCH :
- **Direction artistique** documentée dans `PRODUCT.md` et `DESIGN.md` (registre « product » : familiarité gagnée, sobre, crédible).
- **Système de tokens** OKLCH (neutres froids + pétrole de marque, sémantique d'état), polices **Inter** + **JetBrains Mono** (numéros/montants).
- **App-shell** : barre latérale pétrole profond avec icônes lucide, en-tête utilisateur.
- **Kit UI** réutilisable : Button, Card, Badge, Input/Field, Table, PageHeader.
- **Tous les écrans migrés** : connexion (panneau de marque), tableau de bord (tuiles à icônes), clients, interventions, registre, conformité (jauge), bilan, facturation, prise de commande, clôture, facturation.
- Reste design : vérification visuelle écran par écran (screenshots), responsive mobile (sidebar repliable), micro-animations, charte/logo définitif. À éprouver en lançant `corepack pnpm@9 --filter web dev`.

## Ce qui reste (par ordre de valeur)

- **App mobile chauffeur (M3)** : non démarrée. C'est le gros morceau restant (Expo, offline-first, tunnel d'intervention). Nécessite un vrai téléphone pour tester.
- **Planning/dispatch (M2)** : ✅ écran d'affectation jour × camion + file d'attente livré (voir nuit 3). Restent en option : glisser-déposer, carte/itinéraire, et CRUD du parc camions depuis l'UI (aujourd'hui via seed).
- **Récurrence & relances (M6)** : ✅ moteur A4 (trigger d'échéance), écran CA dormant détaillé et relances livrés (nuit 3). Restent : envoi réel des relances (email/SMS, hors garde-fou), séquence R1/R2/R3 automatisée via pg_cron, portail client (lot 2).
- **Encaissement Stripe** : clés test câblées, intégration paiement à faire.
- **Trackdéchets (BSDD)** : lot 2.
- Détails : SIRET pro à la création, charte graphique, commune réelle dans le bilan (actuellement « Non précisé » faute de jointure intervention→site sur les bordereaux de démo). CRUD sites/ouvrages depuis la fiche : ✅ fait (nuit 3).

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
