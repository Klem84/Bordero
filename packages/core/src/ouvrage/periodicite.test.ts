import { describe, expect, it } from 'vitest';
import { PERIODICITE_DEFAUT_MOIS, prochaineEcheance } from './periodicite.js';
import { documentPourClassification } from '../documents/routing.js';

describe('périodicités et échéances (A4)', () => {
  it('applique les périodicités par défaut du CDC §4', () => {
    expect(PERIODICITE_DEFAUT_MOIS.FOSSE_SEPTIQUE).toBe(48);
    expect(PERIODICITE_DEFAUT_MOIS.BAC_A_GRAISSE).toBe(6);
    expect(PERIODICITE_DEFAUT_MOIS.SEPARATEUR_HYDROCARBURES).toBe(12);
  });

  it('calcule l\'échéance = dernière intervention + périodicité', () => {
    const echeance = prochaineEcheance({
      dateDerniereIntervention: new Date('2024-03-01'),
      periodiciteMois: 48,
    });
    expect(echeance?.toISOString().slice(0, 10)).toBe('2028-03-01');
  });

  it('fait prévaloir la date conseillée par le chauffeur', () => {
    const echeance = prochaineEcheance({
      dateDerniereIntervention: new Date('2024-03-01'),
      periodiciteMois: 48,
      dateConseillee: new Date('2026-09-01'),
    });
    expect(echeance?.toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('retourne null sans périodicité ni date conseillée', () => {
    expect(
      prochaineEcheance({
        dateDerniereIntervention: new Date('2024-03-01'),
        periodiciteMois: null,
      }),
    ).toBeNull();
  });
});

describe('routage documentaire (RG-8.1)', () => {
  it('route chaque classification vers le bon document', () => {
    expect(documentPourClassification('MATIERES_VIDANGE_ANC')).toBe('BSMV');
    expect(documentPourClassification('DECHET_DANGEREUX')).toBe('BSDD');
    expect(documentPourClassification('DECHET_NON_DANGEREUX_HORS_ANC')).toBe('BON_PRESTATION');
  });
});
