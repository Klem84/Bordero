import { describe, expect, it } from 'vitest';
import { appliquerTVACents, calculerPrixLigneCents } from './prix.js';

describe('calcul de prix (CDC §5.1)', () => {
  const prestation = {
    prixBaseCents: 20000, // 200 €
    majorationUrgencePct: 30,
    majorationWeekendPct: 25,
    volumeForfaitM3: 3,
    prixM3SupplementaireCents: 4000, // 40 €/m³
  };

  it('renvoie le prix de base sans contexte', () => {
    expect(calculerPrixLigneCents(prestation)).toBe(20000);
  });

  it('applique la majoration urgence', () => {
    expect(calculerPrixLigneCents(prestation, { urgence: true })).toBe(26000);
  });

  it('cumule urgence et week-end (sur le prix de base)', () => {
    expect(calculerPrixLigneCents(prestation, { urgence: true, weekend: true })).toBe(31000);
  });

  it('facture le dépassement de volume au-delà du forfait', () => {
    // 5 m³ réels - 3 m³ forfait = 2 m³ * 40 € = 80 €
    expect(calculerPrixLigneCents(prestation, { volumeReelM3: 5 })).toBe(28000);
  });

  it('ne facture rien sous le forfait', () => {
    expect(calculerPrixLigneCents(prestation, { volumeReelM3: 2 })).toBe(20000);
  });
});

describe('TVA', () => {
  it('calcule TVA et TTC à 20 %', () => {
    expect(appliquerTVACents(20000, 20)).toEqual({ tvaCents: 4000, ttcCents: 24000 });
  });
});
