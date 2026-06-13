/** Formatage monétaire partagé (centimes -> chaîne EUR fr-FR). */

/** Montant avec centimes : « 1 234,56 € ». */
export const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** Montant arrondi à l'euro (tuiles/KPI) : « 1 235 € ». */
export const eurosRond = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
