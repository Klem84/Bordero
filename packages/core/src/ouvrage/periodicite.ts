/**
 * Ouvrages et périodicités d'entretien (CDC §4 et algorithme A4).
 *
 * L'ouvrage est l'objet entretenu chez le client : c'est la clé de la récurrence
 * commerciale. Chaque type porte une périodicité d'entretien par défaut, héritée
 * du type mais modifiable par l'organisation.
 */

export const OUVRAGE_TYPES = [
  'FOSSE_SEPTIQUE',
  'FOSSE_TOUTES_EAUX',
  'MICRO_STATION',
  'BAC_A_GRAISSE',
  'SEPARATEUR_HYDROCARBURES',
  'POSTE_RELEVAGE',
  'CUVE_FIOUL',
  'CANALISATION',
  'AUTRE',
] as const;

export type OuvrageType = (typeof OUVRAGE_TYPES)[number];

/**
 * Périodicités d'entretien par défaut, en mois (CDC §4).
 * Valeurs paramétrables par l'organisation ; celles-ci ne sont que les défauts.
 * `null` = pas de récurrence automatique par défaut (à définir au cas par cas).
 */
export const PERIODICITE_DEFAUT_MOIS: Record<OuvrageType, number | null> = {
  FOSSE_SEPTIQUE: 48,
  FOSSE_TOUTES_EAUX: 48,
  MICRO_STATION: 48,
  BAC_A_GRAISSE: 6,
  SEPARATEUR_HYDROCARBURES: 12,
  POSTE_RELEVAGE: 12,
  CUVE_FIOUL: null,
  CANALISATION: null,
  AUTRE: null,
};

/**
 * Calcule la date de prochaine échéance d'entretien d'un ouvrage (algorithme A4).
 *
 * Règle : échéance = date de dernière intervention + périodicité. Si le chauffeur
 * a ajusté « prochaine vidange conseillée » à l'étape 3, cette valeur prévaut.
 *
 * @returns la date d'échéance, ou `null` si aucune périodicité n'est définie et
 *          qu'aucune date conseillée n'est fournie.
 */
export function prochaineEcheance(params: {
  dateDerniereIntervention: Date;
  periodiciteMois: number | null;
  /** Date conseillée par le chauffeur sur le terrain ; prévaut si fournie. */
  dateConseillee?: Date | null;
}): Date | null {
  if (params.dateConseillee) {
    return params.dateConseillee;
  }
  if (params.periodiciteMois == null) {
    return null;
  }
  const echeance = new Date(params.dateDerniereIntervention);
  echeance.setMonth(echeance.getMonth() + params.periodiciteMois);
  return echeance;
}
