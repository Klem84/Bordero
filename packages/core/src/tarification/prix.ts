/**
 * Calcul de prix d'une prestation (CDC §5.1) : prix de base + majorations
 * (urgence, week-end) + dépassement de volume au-delà du forfait.
 * Tous les montants sont en centimes (entiers) pour éviter les flottants.
 */

export interface Prestation {
  prixBaseCents: number;
  /** Majoration urgence en pourcentage (ex. 30 pour +30 %). */
  majorationUrgencePct?: number;
  /** Majoration week-end en pourcentage. */
  majorationWeekendPct?: number;
  /** Volume inclus dans le forfait (m³). */
  volumeForfaitM3?: number;
  /** Prix par m³ au-delà du forfait (centimes). */
  prixM3SupplementaireCents?: number;
}

export interface ContexteTarif {
  urgence?: boolean;
  weekend?: boolean;
  /** Volume réellement pompé (m³), pour le calcul du dépassement. */
  volumeReelM3?: number;
}

/** Prix HT d'une ligne de prestation, en centimes. */
export function calculerPrixLigneCents(p: Prestation, ctx: ContexteTarif = {}): number {
  let prix = p.prixBaseCents;
  if (ctx.urgence && p.majorationUrgencePct) {
    prix += Math.round((p.prixBaseCents * p.majorationUrgencePct) / 100);
  }
  if (ctx.weekend && p.majorationWeekendPct) {
    prix += Math.round((p.prixBaseCents * p.majorationWeekendPct) / 100);
  }
  if (
    p.volumeForfaitM3 != null &&
    p.prixM3SupplementaireCents != null &&
    ctx.volumeReelM3 != null
  ) {
    const supplement = Math.max(0, ctx.volumeReelM3 - p.volumeForfaitM3);
    prix += Math.round(supplement * p.prixM3SupplementaireCents);
  }
  return prix;
}

/** Décompose un montant HT en TVA et TTC (centimes). */
export function appliquerTVACents(
  htCents: number,
  tauxPct: number,
): { tvaCents: number; ttcCents: number } {
  const tvaCents = Math.round((htCents * tauxPct) / 100);
  return { tvaCents, ttcCents: htCents + tvaCents };
}
