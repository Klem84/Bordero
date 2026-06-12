/**
 * Conformité : statut du quota d'agrément (CDC §8.6) et statut d'échéance.
 */

export type SeuilQuota = 'ok' | 'information' | 'avertissement' | 'critique';

/**
 * Statut du quota selon les m³ pompés dans l'année vs la quantité maximale annuelle.
 * Seuils : 70 % (information), 85 % (avertissement), 100 % (critique).
 */
export function statutQuota(
  pompeM3: number,
  maxM3: number | null | undefined,
): { ratio: number; pct: number; seuil: SeuilQuota } {
  if (!maxM3 || maxM3 <= 0) return { ratio: 0, pct: 0, seuil: 'ok' };
  const ratio = pompeM3 / maxM3;
  let seuil: SeuilQuota = 'ok';
  if (ratio >= 1) seuil = 'critique';
  else if (ratio >= 0.85) seuil = 'avertissement';
  else if (ratio >= 0.7) seuil = 'information';
  return { ratio, pct: Math.round(ratio * 100), seuil };
}

export type StatutEcheance = 'inconnue' | 'a_jour' | 'proche' | 'depassee';

/** Statut d'une échéance (d'entretien d'ouvrage ou d'agrément). « proche » = sous 6 semaines. */
export function statutEcheance(
  echeanceIso: string | null | undefined,
  refIso: string,
): StatutEcheance {
  if (!echeanceIso) return 'inconnue';
  const e = new Date(echeanceIso).getTime();
  const t = new Date(refIso).getTime();
  const sixSemainesMs = 42 * 24 * 3600 * 1000;
  if (e < t) return 'depassee';
  if (e - t <= sixSemainesMs) return 'proche';
  return 'a_jour';
}

/**
 * Valorise le CA dormant : somme (volume estimé en m³ × tarif au m³) des ouvrages
 * à échéance dépassée, en centimes (CDC §10.1 « CA dormant »).
 */
export function valoriserCaDormant(
  ouvrages: { volumeM3: number }[],
  tarifM3Cents: number,
): number {
  return ouvrages.reduce((total, o) => total + Math.round(o.volumeM3 * tarifM3Cents), 0);
}
