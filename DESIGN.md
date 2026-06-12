# Design

Système visuel de Bordero (back-office web). Registre : product. Stratégie couleur : Restrained (neutres froids + un accent pétrole, sémantique d'état standardisée).

## Theme

Application claire, app-shell à **barre latérale pétrole profond** et contenu clair. Scène : un dirigeant ou son assistante, au bureau de jour, lumière ambiante neutre, en train d'enchaîner des tâches sous légère pression. L'interface est calme, dense quand il faut, jamais bavarde. Modernité par la finition (typo réglée, ombres douces, états soignés), pas par l'effet.

## Color

Tokens en OKLCH (définis dans `apps/web/src/app/globals.css`). Pas de fond crème/sable. Neutres légèrement froids (teintés vers le pétrole de marque).

- `--bg` oklch(0.985 0.004 230) : fond de l'app (blanc cassé froid).
- `--surface` oklch(1 0 0) : cartes, tables.
- `--surface-2` oklch(0.975 0.005 230) : panneaux secondaires.
- `--border` oklch(0.915 0.007 230).
- `--ink` oklch(0.27 0.022 235) : texte courant (contraste élevé).
- `--ink-muted` oklch(0.48 0.02 235) : texte secondaire (≥ 4.5:1 sur surface).
- `--brand` oklch(0.47 0.086 218) : pétrole, actions primaires, sélection, indicateurs.
- `--brand-hover` oklch(0.41 0.09 218).
- `--brand-subtle` oklch(0.955 0.018 218) : fond teinté (tuiles actives, surlignage).
- `--brand-ink` oklch(0.40 0.08 218) : texte de marque sur fond subtil.
- Sidebar : `--sidebar` oklch(0.255 0.03 228) (pétrole-ardoise profond), `--sidebar-ink` oklch(0.84 0.015 228), `--sidebar-muted` oklch(0.63 0.022 228), actif = fond brand + texte blanc.
- Sémantique : `--success` oklch(0.6 0.13 150), `--warning` oklch(0.74 0.15 75), `--danger` oklch(0.58 0.2 25), `--info` oklch(0.6 0.12 240). Chacune avec une variante `-subtle` pour les fonds de badges.

États standardisés : default / hover / focus (anneau brand) / active / disabled / selected / loading / error.

## Typography

Une seule famille : **Inter** (via `next/font`, variable), pour titres, libellés, boutons, corps et données. **Mono** (ui-monospace / JetBrains Mono) réservé aux numéros de bordereau/facture, références et montants tabulaires.

Échelle rem fixe (pas de fluid), ratio ~1.2 : 12 / 14 (base UI) / 16 / 18 / 20 / 24 / 30. Poids : 400 corps, 500 libellés, 600 titres, 700 chiffres clés. Titres en `text-wrap: balance`. Pas de capitales en corps ; capitales réservées aux libellés courts de table.

## Components

- **Boutons** : `primary` (brand plein, texte blanc), `secondary` (contour, surface), `ghost`, `danger`. Rayon `rounded-lg`, hauteur 36-40px, anneau de focus visible, état disabled à 50 %.
- **Cartes** : `rounded-xl`, bordure 1px `--border`, ombre très douce, hover : ombre légèrement accrue. Jamais de bordure-accent latérale.
- **Tables** : en-tête `--surface-2` discret, lignes séparées par bordure fine, hover de ligne, numéros en mono. Denses (registre, factures).
- **Badges de statut** : pastilles arrondies, couleur sémantique sur fond `-subtle` (ex. bordereau Bouclé = success, À régulariser = warning, Annulé = danger).
- **Formulaires** : libellé 14px medium, champ `rounded-lg` bordure `--border`, focus anneau brand, message d'erreur danger.
- **Jauges** (quota) : barre `rounded-full`, remplissage coloré par seuil (info/warning/danger).
- **Sidebar** : fond pétrole profond, item actif = pastille brand, icônes lucide, libellé 14px, pied avec utilisateur + déconnexion.
- **Empty states** : phrase qui apprend l'interface + action, jamais « rien ici ».

## Layout

App-shell : sidebar fixe 240px (repliable en dessous de lg via un état mobile ultérieur) + zone contenu max ~1100px avec padding généreux. Grilles responsives sans points de rupture quand possible (`auto-fit, minmax`). Respiration variable : tuiles aérées sur le tableau de bord, tables denses sur le registre.

## Motion

Transitions 150-200ms, ease-out, sur hover/focus/sélection/chargement uniquement. Pas de séquence d'entrée orchestrée (l'app charge dans une tâche). `prefers-reduced-motion: reduce` : transitions ramenées à un fondu instantané.
