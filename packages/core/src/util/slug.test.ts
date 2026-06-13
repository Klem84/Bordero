import { describe, expect, it } from 'vitest';
import { normaliserSlug } from './slug.js';

describe('normaliserSlug', () => {
  it('met en minuscules et remplace les espaces par des tirets', () => {
    expect(normaliserSlug('Mon Entreprise')).toBe('mon-entreprise');
  });

  it('retire les accents', () => {
    expect(normaliserSlug('Vidanges Démo Aveyron')).toBe('vidanges-demo-aveyron');
    expect(normaliserSlug('éàçùî')).toBe('eacui');
  });

  it('supprime les caractères spéciaux et les doublons de tirets', () => {
    expect(normaliserSlug('Mon  Entreprise !!')).toBe('mon-entreprise');
    expect(normaliserSlug('a/b_c.d')).toBe('a-b-c-d');
  });

  it('retire les tirets de début et de fin', () => {
    expect(normaliserSlug('---abc---')).toBe('abc');
    expect(normaliserSlug('  -test-  ')).toBe('test');
  });

  it('conserve chiffres et tirets internes', () => {
    expect(normaliserSlug('ABC-123')).toBe('abc-123');
  });
});
