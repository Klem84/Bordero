import type { InterventionState } from '@bordero/core';
import { colors } from './theme';

export const STATUT: Record<InterventionState, { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon', color: colors.inkMuted },
  PLANIFIEE: { label: 'Planifiée', color: colors.brand },
  EN_ROUTE: { label: 'En route', color: colors.brand },
  SUR_SITE: { label: 'Sur site', color: colors.brandInk },
  TERMINEE: { label: 'Terminée', color: colors.success },
  IMPOSSIBLE: { label: 'Impossible', color: colors.danger },
  CLOTUREE: { label: 'Clôturée', color: colors.success },
  ANNULEE: { label: 'Annulée', color: colors.danger },
};

/** Libellé de l'action menant à un état (boutons du tunnel chauffeur). */
export const ACTION_VERS: Partial<Record<InterventionState, string>> = {
  EN_ROUTE: 'Démarrer la route',
  SUR_SITE: "Je suis sur site",
  TERMINEE: "Terminer l'intervention",
  IMPOSSIBLE: 'Signaler un problème',
  ANNULEE: 'Annuler',
};
