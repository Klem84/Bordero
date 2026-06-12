/**
 * Routage documentaire (CDC RG-8.1).
 *
 * Le chauffeur ne choisit jamais un « type de formulaire » : il déclare une
 * matière (classification du déchet, portée par l'ouvrage et ajustable sur le
 * terrain), et le système déduit le document réglementaire à générer.
 */

/** Classification de la matière extraite (portée par l'ouvrage). */
export const DECHET_CLASSIFICATIONS = [
  /** Matières de vidange ANC : fosses, micro-stations. */
  'MATIERES_VIDANGE_ANC',
  /** Déchets dangereux : hydrocarbures (code 13 05), etc. */
  'DECHET_DANGEREUX',
  /** Graisses et déchets non dangereux hors ANC. */
  'DECHET_NON_DANGEREUX_HORS_ANC',
] as const;

export type DechetClassification = (typeof DECHET_CLASSIFICATIONS)[number];

/** Document réglementaire généré à la clôture. */
export const DOCUMENT_TYPES = [
  /** Bordereau de suivi des matières de vidange, 3 volets (arrêté du 7 sept. 2009). */
  'BSMV',
  /** Bordereau de suivi de déchets dangereux, dématérialisé via Trackdéchets. */
  'BSDD',
  /** Bon de prestation + ligne au registre des déchets sortants. */
  'BON_PRESTATION',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const ROUTING: Record<DechetClassification, DocumentType> = {
  MATIERES_VIDANGE_ANC: 'BSMV',
  DECHET_DANGEREUX: 'BSDD',
  DECHET_NON_DANGEREUX_HORS_ANC: 'BON_PRESTATION',
};

/**
 * Déduit le document réglementaire à partir de la classification de la matière.
 * RG-8.1 : règle déterministe, jamais un choix laissé à l'utilisateur.
 */
export function documentPourClassification(classification: DechetClassification): DocumentType {
  return ROUTING[classification];
}
