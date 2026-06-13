import { describe, expect, it } from 'vitest';
import { statutEcheance, statutQuota, valoriserCaDormant } from './quota.js';

describe('statut de quota (CDC §8.6)', () => {
  it('classe les seuils 70 / 85 / 100 %', () => {
    expect(statutQuota(50, 100).seuil).toBe('ok');
    expect(statutQuota(70, 100).seuil).toBe('information');
    expect(statutQuota(85, 100).seuil).toBe('avertissement');
    expect(statutQuota(100, 100).seuil).toBe('critique');
    expect(statutQuota(120, 100).seuil).toBe('critique');
  });

  it('gère un quota absent', () => {
    expect(statutQuota(50, null).seuil).toBe('ok');
    expect(statutQuota(50, 0).pct).toBe(0);
  });

  it('calcule le pourcentage', () => {
    expect(statutQuota(43, 100).pct).toBe(43);
  });
});

describe("statut d'échéance", () => {
  const ref = '2026-06-13T00:00:00.000Z';
  it('détecte une échéance dépassée', () => {
    expect(statutEcheance('2026-05-01', ref)).toBe('depassee');
  });
  it('détecte une échéance proche (sous 6 semaines)', () => {
    expect(statutEcheance('2026-07-01', ref)).toBe('proche');
  });
  it('détecte une échéance à jour', () => {
    expect(statutEcheance('2026-12-01', ref)).toBe('a_jour');
  });
  it('renvoie inconnue sans date', () => {
    expect(statutEcheance(null, ref)).toBe('inconnue');
  });
});

describe('valorisation du CA dormant', () => {
  it('somme volume × tarif au m³', () => {
    // (3 + 4) m³ × 80 €/m³ = 560 € = 56000 cts
    expect(valoriserCaDormant([{ volumeM3: 3 }, { volumeM3: 4 }], 8000)).toBe(56000);
  });
});
