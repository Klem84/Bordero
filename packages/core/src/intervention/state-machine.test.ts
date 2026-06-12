import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  IllegalTransitionError,
  INTERVENTION_STATES,
  INTERVENTION_TRANSITIONS,
  isFinalState,
} from './state-machine.js';

describe('machine à états de l\'intervention', () => {
  it('couvre exactement les 8 états du CDC §3.3', () => {
    expect(INTERVENTION_STATES).toHaveLength(8);
  });

  it('autorise le flux nominal complet', () => {
    expect(canTransition('BROUILLON', 'PLANIFIEE')).toBe(true);
    expect(canTransition('PLANIFIEE', 'EN_ROUTE')).toBe(true);
    expect(canTransition('EN_ROUTE', 'SUR_SITE')).toBe(true);
    expect(canTransition('SUR_SITE', 'TERMINEE')).toBe(true);
    expect(canTransition('TERMINEE', 'CLOTUREE')).toBe(true);
  });

  it('refuse les sauts d\'état illégaux', () => {
    expect(canTransition('BROUILLON', 'TERMINEE')).toBe(false);
    expect(canTransition('PLANIFIEE', 'CLOTUREE')).toBe(false);
    expect(canTransition('SUR_SITE', 'PLANIFIEE')).toBe(false);
  });

  it('traite CLOTUREE et ANNULEE comme des états terminaux', () => {
    expect(isFinalState('CLOTUREE')).toBe(true);
    expect(isFinalState('ANNULEE')).toBe(true);
    expect(INTERVENTION_TRANSITIONS.CLOTUREE).toHaveLength(0);
    expect(INTERVENTION_TRANSITIONS.ANNULEE).toHaveLength(0);
  });

  it('permet la replanification après un empêchement', () => {
    expect(canTransition('IMPOSSIBLE', 'PLANIFIEE')).toBe(true);
    expect(canTransition('IMPOSSIBLE', 'ANNULEE')).toBe(true);
  });

  it('assertTransition lève IllegalTransitionError sur transition interdite', () => {
    expect(() => assertTransition('CLOTUREE', 'EN_ROUTE')).toThrow(IllegalTransitionError);
    expect(() => assertTransition('SUR_SITE', 'TERMINEE')).not.toThrow();
  });
});
