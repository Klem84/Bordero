# Rapport de nuit — Bordero

Session de développement autonome du 2026-06-12 (soir) au 2026-06-13. Tout est sur la branche `auto/overnight-build` et la PR https://github.com/Klem84/Bordero/pull/1. Travail exclusivement sur le projet Supabase **staging**.

## En une phrase

Le parcours métier complet de Bordero fonctionne **de bout en bout** et est démontrable avec des données de démo : **prise de commande → planning (affectation camion + feuille de route) → exécution chauffeur hors ligne (état, relevé, signature) → clôture → bordereau BSMV (PDF + numéro légal) → registre → facture (PDF) → encaissement Stripe (test) / avoir → bilan annuel préfectoral**, plus la **récurrence** (CA dormant, relances R1→R2→R3) et le **paramétrage** (parc, exutoires, agréments), le tout sur une base multi-tenant sécurisée et un design soigné/accessible.

## État de vérification (dernière passe)

Tout est vert : `corepack pnpm@9 --filter web build` OK ; `corepack pnpm@9 -r test` = 40 (core) + 2 (pdf) ; `corepack pnpm@9 --filter @bordero/db test:rls` = 9/9 ; typecheck app mobile OK (`cd apps/mobile && npx tsc --noEmit`). Chaque chunk de la nuit a été commité et poussé sur `auto/overnight-build` après build/tests verts.

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
- Vérifier les tests : `corepack pnpm@9 -r test` (core 40, pdf 2) et `corepack pnpm@9 --filter @bordero/db test:rls` (9/9).
- Build de prod : `corepack pnpm@9 --filter web build`.
- App mobile chauffeur (hors workspace pnpm) : `cd apps/mobile && corepack pnpm@9 install --ignore-workspace` puis `npx tsc --noEmit` (ou `corepack pnpm@9 --filter @bordero/mobile start` pour Expo, nécessite un téléphone). Variables `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` à mettre dans `apps/mobile/.env.local`.

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

**Encaissement Stripe en mode TEST (nuit 3)**
- Bouton « Encaisser » sur les factures dues (`/app/facturation`) : crée une session Stripe Checkout hébergée (mode test, locale fr, montant = solde restant dû), redirige vers la page de paiement Stripe.
- Au retour, la route `/app/facturation/retour-stripe` vérifie l'état réel de la session côté Stripe (`payment_status === 'paid'`) puis enregistre le paiement via `rpc_enregistrer_paiement` (idempotent par PaymentIntent, index unique partiel) : la facture passe en « payée » ou « partiellement payée ». **Pas de webhook** (vérification au retour, suffisant en staging ; le webhook reste à câbler pour la prod).
- Badge « Stripe mode test » et bannières de retour (payé / annulé / échec). Seed : facture émise de démo `F-2026-90001` (180 € TTC).
- **Aucun paiement réel** : clés `sk_test_`/`pk_test_` uniquement. Carte de test Stripe pour la démo : `4242 4242 4242 4242`, date future, CVC quelconque.
- Vérifié : build OK, 9/9 RLS, 36 core, RPC paiement testé (partiel, solde, idempotence, cloisonnement), création de session Checkout test validée contre l'API Stripe.

**App mobile chauffeur — socle (M3, nuit 3)**
- `apps/mobile` : socle Expo Router offline-first. Écrans : connexion, « Ma tournée » (interventions du jour depuis le cache local), tunnel d'intervention (transitions terrain en gros boutons). Thème terrain (cibles ≥ 56px, contrastes francs).
- Offline-first : base SQLite locale (`expo-sqlite`) = cache des interventions + file d'attente d'événements (outbox). Couche de sync idempotente : push des transitions via la RPC `rpc_sync_evenement` (SECURITY DEFINER, idempotent par `client_event_uuid`, transition arbitrée serveur, algo A2), puis pull de la tournée. La machine à états vient de `@bordero/core` (jamais redupliquée).
- L'app mobile (React 18.3 / RN 0.76) est **sortie du workspace pnpm** : son `@types/react` 18 croisait celui du back-office (React 19) et cassait le build web. Elle s'installe en standalone.
- Vérifié : typecheck mobile OK (`tsc`), web build OK, 9/9 RLS, 36 core, 2 pdf.

**Polish design — responsive (nuit 3)**
- Barre latérale désormais responsive : fixe sur grand écran, drawer coulissant sous `lg` (overlay assombri, transition 200ms ease-out, fermeture par clic sur l'overlay, touche Échap, ou navigation), avec barre supérieure mobile (bouton menu + marque). Contenu adapté (paddings mobile/desktop). Centralisé dans `AppShell` ; le layout `/app` est simplifié.

**M2 — gestion du parc camions depuis l'UI (nuit 3)**
- Écran `/app/parametres` (entrée « Paramètres » dans la sidebar) : liste du parc, ajout/édition de camion en ligne (immatriculation, type, capacité de citerne, échéances contrôle technique et ADR), activation/désactivation. Badges d'échéance CT/ADR (à jour / proche / expiré).
- Écritures réservées aux administrateurs (RLS camions admin-only) ; les autres rôles voient un message lecture seule. Pas de suppression dure (FK tournées) : on désactive (champ `actif`), cohérent avec le filtre du planning. Le parc n'était jusqu'ici alimentable que par le seed.
- Vérifié : build OK ; CRUD camions testé sous RLS (admin OK, exploitation rejeté, cloisonnement inter-organisations).

**Paramètres — exutoires & agréments (nuit 3)**
- `/app/parametres` étoffé en 3 sections : Flotte (camions), Exutoires (filières d'élimination), Agréments préfectoraux. Ajout/édition/suppression en ligne, réservés aux administrateurs (RLS admin-only).
- Exutoires : raison sociale, type, adresse, SIRET, contact, tarif de dépotage (saisi en euros, stocké en centimes). Agréments : numéro, département, dates délivrance/échéance, quota annuel, statut (badge) + indication d'échéance. La modification d'agrément revalide aussi l'écran Conformité (quota/bilan).
- Tout le paramétrage réglementaire est désormais éditable depuis l'UI (plus seulement via le seed).
- Vérifié : build OK ; CRUD exutoires & agréments testés sous RLS (admin OK, exploitation rejeté).

**Polish design — squelettes de chargement (nuit 3)**
- Primitif `Skeleton` + helpers (en-tête, table, grille de cartes) et `loading.tsx` sur 9 écrans (tableau de bord, clients, interventions, planning, récurrence, conformité + registre, facturation, paramètres). Pendant le chargement serveur, l'utilisateur voit la structure de l'écran plutôt qu'un blanc. Annonce `role="status"` pour les lecteurs d'écran ; animation neutralisée par `prefers-reduced-motion`.

**M6 — séquence de relances R1→R2→R3 (nuit 3)**
- Escalade « sans réponse, étape suivante » : `rpc_avancer_relance` marque l'étape courante traitée et crée la suivante, planifiée à +14 jours (R3 terminal), avec gestion de la tâche bureau. `rpc_generer_relances_dues` crée une R1 + tâche pour chaque ouvrage en retard sans relance active (idempotent, relançable sans doublon).
- `/app/recurrence` : bouton « Générer les relances dues », badge d'étape (R1/R2/R3) sur chaque relance, boutons « Aboutie » (succès), « Sans réponse → Rn » (escalade) et annulation. **Toujours aucun envoi réel** (les relances restent une liste d'actions à mener).
- Note : la génération automatique quotidienne (pg_cron) n'est volontairement PAS activée (effet de bord) ; la fonction SQL est prête, déclenchable manuellement depuis l'écran. À planifier en prod via pg_cron si souhaité.
- Vérifié : build OK ; séquence testée (génération idempotente, R1→R2 à +14j, R2→R3, R3 terminal).

**M5 — avoirs (notes de crédit) (nuit 3)**
- `rpc_creer_avoir` : depuis une facture émise (immuable), crée un avoir (`kind='avoir'`, `facture_origine_id`) recopiant les lignes en quantités négatives, numérotation dédiée `AV-AAAA-NNNNN`, PDF généré et stocké. Un seul avoir par facture ; un avoir ne porte que sur une facture.
- Écran Facturation : la liste affiche factures et avoirs (badge « Avoir », montant négatif, lien vers la facture d'origine) ; bouton « Avoir » (avec saisie d'un motif) sur les factures émises non encore créditées.
- **Webhook Stripe (prod) à câbler par toi** : l'encaissement actuel vérifie la session au retour (suffisant en staging). Pour la prod, ajouter un endpoint `POST /api/stripe/webhook` qui vérifie la signature (`STRIPE_WEBHOOK_SECRET`) et appelle `rpc_enregistrer_paiement` sur l'événement `checkout.session.completed`, afin de fiabiliser l'encaissement même si l'utilisateur ferme l'onglet. (Non fait : nécessite une URL publique + secret webhook, hors garde-fou nocturne.)
- Vérifié : build OK ; avoir testé (totaux négatifs, lignes négatives, doublon rejeté, avoir-sur-avoir rejeté).

**App mobile — relevés terrain (nuit 3)**
- L'écran intervention de l'app chauffeur propose un formulaire de relevé (volume pompé, observations, prochaine vidange conseillée) dès que l'intervention est « Sur site » ou « Terminée ». Offline-first : le relevé est empilé dans l'outbox SQLite (type `releve`) et poussé à la synchronisation.
- `rpc_sync_releve` (idempotent par `client_event_uuid`) fait l'upsert dans `intervention_ouvrages` et reporte l'échéance sur l'ouvrage : la date conseillée par le chauffeur prévaut sur l'échéance calculée (A4).
- Vérifié : typecheck mobile OK ; RPC testée (upsert, échéance A4, idempotence, cloisonnement).

**Polish design — erreurs & 404 (nuit 3)**
- `error.tsx` (groupe /app) : limite d'erreur soignée (message rassurant « vos données ne sont pas affectées », bouton Réessayer + retour tableau de bord, référence technique). `not-found.tsx` : 404 de marque. `global-error.tsx` : filet de sécurité racine (styles inline). Plus d'écran blanc ni de page Next par défaut en cas de pépin.

**App mobile — signature / preuve d'intervention (nuit 3)**
- Section « Signature client » sur l'écran intervention (Sur site / Terminée) : saisie du nom du signataire présent, ou case « client absent ». Offline-first via l'outbox SQLite (type `signature`), poussé à la synchronisation.
- `rpc_sync_signature` (idempotent par `client_event_uuid`) enregistre `signataire_nom` + `client_absent` sur l'intervention. (La signature dessinée à l'écran est repoussée : elle nécessite un module natif de capture ; le nom + l'horodatage de l'événement font foi pour le MVP.)
- Vérifié : typecheck mobile OK ; RPC testée (nom, idempotence, client absent, cloisonnement).

**App mobile — écran « À synchroniser » (nuit 3)**
- Écran dédié listant les actions terrain en attente (changement d'état, relevé, signature) avec résumé lisible et horodatage, bouton « Synchroniser maintenant » (retour : envoyés / en attente), état vide rassurant. Le compteur de la tournée y renvoie d'un toucher. Donne au chauffeur la visibilité sur ce qui reste à remonter quand le réseau revient.

**Polish design — titres de page (nuit 3)**
- Template de titre racine « %s · Bordero » et `metadata.title` par écran (tableau de bord, clients, interventions, planning, récurrence, conformité + registre + bilan, facturation, paramètres, nouvelle commande, intervention). La fiche client affiche le nom du client dans l'onglet (generateMetadata). Onglets lisibles, repérage facilité, meilleur référencement/accessibilité.

**M2 — feuille de route de tournée imprimable (nuit 3)**
- Route `/app/planning/[date]/[camion]` : feuille de route prête à imprimer (en-tête organisation + camion + date, ordre de passage, client/adresse, prestation, ouvrage, créneau, volume et durée estimés, totaux, ligne signature/horaires). Bouton « Imprimer » et lien imprimante sur chaque colonne camion du planning.
- Mise en page d'impression propre : la coquille (sidebar/drawer/en-tête mobile) est masquée à l'impression, contenu en pleine largeur. Donne au dirigeant un document papier à remettre au chauffeur qui n'utilise pas encore l'app.

**Conformité — commune réelle dans le bilan annuel (nuit 3)**
- Le bilan annuel agrège désormais « par commune » à partir de données réelles : la commune et l'ouvrage sont dérivés du bordereau via l'intervention liée (intervention → site → adresse, commune extraite du code postal). Le « Non précisé » disparaît pour les bordereaux reliés.
- Seed : les 3 bordereaux bouclés de démo sont reliés à des interventions de communes distinctes (Onet-le-Château, Olemps, Rodez) et à l'exutoire (STEP), pour un bilan démontrable par commune et par filière.
- Vérifié : build OK, 36 core, parsing commune contrôlé.

**M1 — SIRET client (nuit 3)**
- Saisie du SIRET à la création d'un client (champ dédié, pertinent pour professionnels/collectivités) et affichage sur la fiche client quand renseigné. La RPC `rpc_creer_client_site` accepte désormais le SIRET (la colonne existait déjà). Édition du SIRET sur la fiche : à ajouter ultérieurement (pas de formulaire d'édition client pour l'instant).

**M1 — édition de la fiche client (nuit 3)**
- Bouton « Modifier la fiche » sur la fiche client : formulaire en ligne (type, nom, téléphone, email, SIRET), enregistrement via PostgREST sous RLS office (admin/exploitation). L'en-tête et le titre d'onglet se rafraîchissent après modification. Complète la saisie du SIRET (désormais éditable a posteriori).
- Vérifié : build OK ; édition testée sous RLS (exploitation OK, chauffeur refusé).

**Polish design — états vides actionnables (nuit 3)**
- Composant `EmptyState` réutilisable (icône, titre, phrase qui apprend l'interface, action claire). Appliqué aux listes principales : clients (→ Nouveau client), interventions (→ Clients), facturation (→ Interventions), registre (→ Interventions). Chaque écran vide guide vers l'étape suivante au lieu d'afficher une simple ligne « rien ici ».

**M1 — recherche de clients (nuit 3)**
- Champ de recherche sur la liste clients (formulaire GET, fonctionne sans JS) filtrant par nom, email ou téléphone côté serveur (ilike). Bouton « Effacer », et état vide distinct « Aucun résultat pour … ». Utile dès que le fichier clients grandit.

**Qualité — parsing commune dans le core + tests (nuit 3)**
- `communeDeAdresse` (extraction de la commune après le code postal, utilisée par le bilan A3) remontée dans `@bordero/core` : règle métier non dupliquée, importée par le web. 4 tests ajoutés (code postal, communes composées type Onet-le-Château / Saint-Côme-d'Olt, zone sans numéro, absence de code postal). Suite core à 40 tests.

**Facturation — filtre par statut + a11y (nuit 3)**
- Filtre par statut sur la liste de facturation (formulaire GET, totaux conservés sur l'ensemble, affichage filtré, état vide dédié + réinitialisation). La bannière de retour Stripe est désormais annoncée aux lecteurs d'écran (`role="status"` + `aria-live="polite"`).

**Tableau de bord — « Tâches à faire » (nuit 3)**
- Section sous les tuiles listant les tâches bureau ouvertes (alimentées par les relances de récurrence) : libellé + échéance (en retard signalée), état vide actionnable. Boucle visiblement le flux relance → tâche → bureau. Seed : 2 tâches de démo.

**Interventions — filtre par statut (nuit 3)**
- Filtre par statut sur la liste des interventions (formulaire GET, valeur validée), avec état vide dédié et réinitialisation. Cohérent avec les filtres du registre et de la facturation.

**Facturation — export CSV (nuit 3)**
- Export CSV des factures et avoirs (numéro, type, date, statut, client, HT/TVA/TTC), filtre par statut respecté, BOM UTF-8 + séparateur `;` (ouverture directe Excel FR). Bouton « Exporter CSV » dans l'en-tête. Complète l'export CSV déjà présent sur le registre.

**M1 — encours par client (nuit 3)**
- Résumé de facturation sur la fiche client : Facturé (net des avoirs), Encaissé, Reste dû (en rouge si positif), affiché dès qu'il existe une facture. Le bureau voit l'encours d'un client d'un coup d'œil.

**Clients — export CSV (nuit 3)**
- Export CSV de la liste clients (nom, type, téléphone, email, SIRET), recherche respectée, BOM UTF-8 + séparateur `;`. Bouton « Exporter CSV » dans l'en-tête. Sauvegarde / reprise de fichier facilitée. (Exports CSV désormais sur registre, facturation et clients.)

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

- **App mobile chauffeur (M3)** : ✅ socle Expo offline-first livré (nuit 3, typecheck OK). Restent (nécessitent un téléphone / EAS) : test réel sur device (Expo Go ou build dev), relevés terrain (volumes, photos, signature), mode hors ligne éprouvé, file de sync sous coupure réseau, icônes/splash, build EAS. Créer un utilisateur Supabase rôle `chauffeur` pour tester le filtrage RLS.
- **Planning/dispatch (M2)** : ✅ écran d'affectation jour × camion + file d'attente livré (voir nuit 3). Restent en option : glisser-déposer, carte/itinéraire, et CRUD du parc camions depuis l'UI (aujourd'hui via seed).
- **Récurrence & relances (M6)** : ✅ moteur A4 (trigger d'échéance), écran CA dormant détaillé, relances et séquence R1→R2→R3 (escalade + génération idempotente des relances dues) livrés (nuit 3). Restent : envoi réel des relances (email/SMS, hors garde-fou), planification automatique via pg_cron (fonction prête, non activée), portail client (lot 2).
- **Encaissement Stripe** : ✅ Stripe Checkout en mode test + avoirs (notes de crédit) livrés (nuit 3). Restent : webhook Stripe pour confirmation hors-redirect (prod, voir section M5 avoirs ci-dessus), remboursement Stripe réel (hors garde-fou), lien de paiement par SMS/email (hors garde-fou).
- **Trackdéchets (BSDD)** : lot 2.
- Détails : SIRET pro à la création, charte graphique. CRUD sites/ouvrages depuis la fiche : ✅ fait (nuit 3). Commune réelle dans le bilan : ✅ fait (nuit 3).

## Actions qui requièrent ta main

- Rien d'irréversible n'a été fait. Tout est sur la branche `auto/overnight-build` (PR #1) : **relis et merge quand tu veux**.
- **Stripe (prod)** : l'encaissement actuel vérifie la session au retour (suffisant en staging). Pour la prod, câbler un webhook `checkout.session.completed` (endpoint public + `STRIPE_WEBHOOK_SECRET`) appelant `rpc_enregistrer_paiement`. Détails dans la section M5/avoirs.
- **App mobile** : à tester sur un vrai téléphone (Expo Go / build dev) ; créer un utilisateur Supabase de rôle `chauffeur` rattaché à l'org de démo pour valider le filtrage RLS terrain. La signature dessinée et la génération automatique des relances (pg_cron) restent à activer (fonctions prêtes).
- **Récurrence (prod)** : activer la génération quotidienne des relances dues via pg_cron si souhaité (`rpc_generer_relances_dues`, aujourd'hui déclenchable manuellement).
- Optionnel : fournir les clés **Sentry** (DSN) et **PostHog** (clé EU) pour le monitoring.
- Le hook d'auth Supabase est déjà activé (vérifiable dans Authentication → Hooks).

## Notes techniques (pour reprendre le fil)

- Migrations : `corepack pnpm@9 exec supabase db push --db-url "postgresql://postgres:<MOT_DE_PASSE_.env.local>@db.eygkjljrepqjffsmatnk.supabase.co:5432/postgres"` (le pooler régional ne marche pas, la connexion directe oui). Regénérer les types ensuite : `SUPABASE_ACCESS_TOKEN=<.env.local> corepack pnpm@9 exec supabase gen types typescript --project-id eygkjljrepqjffsmatnk --schema public > packages/db/src/types.ts` (pas `--db-url`, qui exige Docker).
- Utilitaire SQL : `node packages/db/scripts/sql.mjs "<sql>"`. Seed : `node packages/db/scripts/seed.mjs`.
- Clé `sb_secret_` : marche pour Storage et l'API admin auth, **pas** pour PostgREST (401). Écritures privilégiées via RPC SECURITY DEFINER appelée par l'utilisateur authentifié.
- Quirk supabase-js/ssr : l'inférence générique ne thread pas `Database` jusqu'aux requêtes ; on caste les résultats (`as XxxRow[]`) et les args (`as never`). À harmoniser via un helper typé.
- `next.config.mjs` : `extensionAlias` .js→.ts pour les packages internes côté client, `serverExternalPackages: ['@react-pdf/renderer']`, chargement du `.env.local` racine via dotenv.
- Secrets dans `Acces.txt` et `.env.local` (gitignorés, jamais poussés).
