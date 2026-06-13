/**
 * Bilan annuel d'activité préfectoral (CDC §8.4, algorithme A3).
 * Agrégats + contrôles de complétude à partir des bordereaux de l'année.
 */

export interface BordereauBilan {
  commune: string | null;
  ouvrageId: string | null;
  exutoire: string | null;
  quantitePompeeM3: number;
  quantiteDepoteeM3: number | null;
  statut: string;
}

export interface InstallationCommune {
  commune: string;
  nbInstallations: number;
  volumeM3: number;
}
export interface VolumeFiliere {
  exutoire: string;
  volumeM3: number;
}
export interface BilanAgregats {
  installationsParCommune: InstallationCommune[];
  volumesParFiliere: VolumeFiliere[];
  totalPompeM3: number;
  totalDepoteM3: number;
  controles: {
    bordereauxNonBoucles: number;
    ecartPompeDepotePct: number;
    depassementQuota: boolean;
    complet: boolean;
  };
}

const SANS_COMMUNE = 'Non précisé';
const SANS_FILIERE = 'Non précisé';

export function calculerBilan(
  bordereaux: BordereauBilan[],
  quotaMaxM3: number | null | undefined,
): BilanAgregats {
  const communes = new Map<string, { ouvrages: Set<string>; rows: number; volume: number }>();
  const filieres = new Map<string, number>();
  let totalPompe = 0;
  let totalDepote = 0;
  let nonBoucles = 0;

  for (const b of bordereaux) {
    totalPompe += b.quantitePompeeM3;
    totalDepote += b.quantiteDepoteeM3 ?? 0;
    if (b.statut !== 'BOUCLE') nonBoucles += 1;

    const commune = b.commune ?? SANS_COMMUNE;
    const entry = communes.get(commune) ?? { ouvrages: new Set<string>(), rows: 0, volume: 0 };
    if (b.ouvrageId) entry.ouvrages.add(b.ouvrageId);
    entry.rows += 1;
    entry.volume += b.quantitePompeeM3;
    communes.set(commune, entry);

    const filiere = b.exutoire ?? SANS_FILIERE;
    filieres.set(filiere, (filieres.get(filiere) ?? 0) + (b.quantiteDepoteeM3 ?? b.quantitePompeeM3));
  }

  const ecart =
    totalPompe > 0 ? Math.abs(totalPompe - totalDepote) / totalPompe * 100 : 0;
  const depassementQuota = !!quotaMaxM3 && totalPompe > quotaMaxM3;

  return {
    installationsParCommune: [...communes.entries()]
      .map(([commune, e]) => ({
        commune,
        nbInstallations: e.ouvrages.size > 0 ? e.ouvrages.size : e.rows,
        volumeM3: e.volume,
      }))
      .sort((a, b) => b.volumeM3 - a.volumeM3),
    volumesParFiliere: [...filieres.entries()]
      .map(([exutoire, volumeM3]) => ({ exutoire, volumeM3 }))
      .sort((a, b) => b.volumeM3 - a.volumeM3),
    totalPompeM3: totalPompe,
    totalDepoteM3: totalDepote,
    controles: {
      bordereauxNonBoucles: nonBoucles,
      ecartPompeDepotePct: Math.round(ecart * 10) / 10,
      depassementQuota,
      complet: nonBoucles === 0 && ecart <= 5 && !depassementQuota,
    },
  };
}

/**
 * Extrait la commune d'une adresse postale française : la portion qui suit le
 * code postal à 5 chiffres (« 8 chemin des Prés, 12000 Rodez » -> « Rodez »).
 * Tolère les communes composées (Onet-le-Château, Saint-Côme-d'Olt) et renvoie
 * `null` si aucun code postal n'est trouvé. Utilisé pour l'agrégation du bilan
 * par commune (A3).
 */
export function communeDeAdresse(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  const m = adresse.match(/\b\d{5}\s+(.+?)\s*$/);
  return m?.[1] ? m[1].trim() : null;
}
