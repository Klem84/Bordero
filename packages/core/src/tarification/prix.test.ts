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

  it('ne facture rien au volume exactement égal au forfait', () => {
    expect(calculerPrixLigneCents(prestation, { volumeReelM3: 3 })).toBe(20000);
  });

  it('cumule urgence + week-end + dépassement de volume', () => {
    // 20000 base + 6000 urgence + 5000 we + (5-3)*4000 volume = 39000
    expect(
      calculerPrixLigneCents(prestation, { urgence: true, weekend: true, volumeReelM3: 5 }),
    ).toBe(39000);
  });

  it('ignore les majorations sans pourcentage défini', () => {
    expect(calculerPrixLigneCents({ prixBaseCents: 10000 }, { urgence: true, weekend: true })).toBe(
      10000,
    );
  });
});

describe('TVA', () => {
  it('calcule TVA et TTC à 20 %', () => {
    expect(appliquerTVACents(20000, 20)).toEqual({ tvaCents: 4000, ttcCents: 24000 });
  });

  it('arrondit la TVA au centime', () => {
    // 999 * 20 % = 199,8 -> 200
    expect(appliquerTVACents(999, 20)).toEqual({ tvaCents: 200, ttcCents: 1199 });
  });

  it('gère la TVA réduite à 10 %', () => {
    expect(appliquerTVACents(15000, 10)).toEqual({ tvaCents: 1500, ttcCents: 16500 });
  });
});
