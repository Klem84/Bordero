/**
 * Machine à états de l'Intervention (CDC §3.3).
 *
 * L'Intervention est l'objet central du système. Cette machine à états est la
 * source de vérité partagée entre le back-office et l'app chauffeur. Elle est
 * doublée côté base (CHECK + trigger sur `interventions.status`) pour qu'aucun
 * état illégal ne puisse être produit, même en cas de bug applicatif.
 */

export const INTERVENTION_STATES = [
  'BROUILLON',
  'PLANIFIEE',
  'EN_ROUTE',
  'SUR_SITE',
  'TERMINEE',
  'IMPOSSIBLE',
  'CLOTUREE',
  'ANNULEE',
] as const;

export type InterventionState = (typeof INTERVENTION_STATES)[number];

/**
 * Transitions autorisées (CDC §3.3).
 *
 * Note : le CDC mentionne « INCIDENT » comme cible de sortie de EN_ROUTE, mais
 * INCIDENT n'est pas un état défini dans la liste. On le modélise par IMPOSSIBLE
 * (empêchement : panne, accès bloqué…), cohérent avec le bouton « Signaler un
 * problème » de l'app chauffeur. À confirmer au modèle de données du Sprint 1.
 */
export const INTERVENTION_TRANSITIONS: Record<InterventionState, readonly InterventionState[]> = {
  BROUILLON: ['PLANIFIEE'],
  PLANIFIEE: ['EN_ROUTE', 'ANNULEE'],
  EN_ROUTE: ['SUR_SITE', 'IMPOSSIBLE'],
  SUR_SITE: ['TERMINEE', 'IMPOSSIBLE'],
  TERMINEE: ['CLOTUREE'],
  IMPOSSIBLE: ['PLANIFIEE', 'ANNULEE'],
  CLOTUREE: [],
  ANNULEE: [],
};

/** États terminaux : aucune transition sortante. */
export const INTERVENTION_FINAL_STATES: readonly InterventionState[] = ['CLOTUREE', 'ANNULEE'];

export function isFinalState(state: InterventionState): boolean {
  return INTERVENTION_FINAL_STATES.includes(state);
}

export function canTransition(from: InterventionState, to: InterventionState): boolean {
  return INTERVENTION_TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: InterventionState,
    public readonly to: InterventionState,
  ) {
    super(`Transition d'intervention illégale : ${from} → ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

/**
 * Valide une transition ou lève une erreur. À utiliser côté serveur avant
 * d'écrire le nouvel état (la base reste le dernier rempart).
 */
export function assertTransition(from: InterventionState, to: InterventionState): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}
