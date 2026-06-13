import { describe, expect, it } from 'vitest';
import { optimiserTournee, distanceHaversineM, type PointTournee } from './deux-opt.js';

// Points alignés sur un méridien (lng constant), latitudes croissantes : l'ordre
// optimal évident est A, B, C, D, E.
const A: PointTournee = { id: 'A', lat: 0, lng: 0 };
const B: PointTournee = { id: 'B', lat: 1, lng: 0 };
const C: PointTournee = { id: 'C', lat: 2, lng: 0 };
const D: PointTournee = { id: 'D', lat: 3, lng: 0 };
const E: PointTournee = { id: 'E', lat: 4, lng: 0 };

describe('optimiserTournee (2-opt)', () => {
  it('remet en ordre des arrêts alignés mélangés', () => {
    const r = optimiserTournee([A, C, B, E, D]);
    expect(r.ordreIds).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(r.distanceM).toBeLessThan(r.distanceInitialeM);
    expect(r.ameliorationPct).toBeGreaterThan(0);
  });

  it('ne dégrade jamais un ordre déjà optimal (gain nul)', () => {
    const r = optimiserTournee([A, B, C, D, E]);
    expect(r.ordreIds).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(r.ameliorationPct).toBe(0);
    expect(r.distanceM).toBeCloseTo(r.distanceInitialeM, 6);
  });

  it('conserve exactement le même ensemble d’arrêts', () => {
    const r = optimiserTournee([D, A, E, C, B]);
    expect([...r.ordreIds].sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(r.ordreIds).toHaveLength(5);
  });

  it('n’améliore rien avec 0, 1 ou 2 arrêts', () => {
    expect(optimiserTournee([]).ordreIds).toEqual([]);
    expect(optimiserTournee([A]).ordreIds).toEqual(['A']);
    const r2 = optimiserTournee([B, A]);
    expect(r2.ordreIds).toEqual(['B', 'A']);
    expect(r2.ameliorationPct).toBe(0);
  });

  it('part du dépôt quand il est fourni', () => {
    // Dépôt au sud de A : le plus proche est A, puis B, C.
    const r = optimiserTournee([B, A, C], { depart: { lat: -1, lng: 0 } });
    expect(r.ordreIds).toEqual(['A', 'B', 'C']);
  });

  it('le résultat est stable (idempotent)', () => {
    const premier = optimiserTournee([C, A, D, B, E]);
    const second = optimiserTournee(
      premier.ordreIds.map((id) => [A, B, C, D, E].find((p) => p.id === id)!),
    );
    expect(second.ordreIds).toEqual(premier.ordreIds);
    expect(second.ameliorationPct).toBe(0);
  });

  it('accepte une fonction de distance personnalisée', () => {
    const calls: string[] = [];
    const r = optimiserTournee([A, C, B], {
      distance: (x, y) => {
        calls.push('d');
        return distanceHaversineM(x, y);
      },
    });
    expect(r.ordreIds).toEqual(['A', 'B', 'C']);
    expect(calls.length).toBeGreaterThan(0);
  });
});
