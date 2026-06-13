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

/** Date courte fr-FR (« 13/06/2026 ») depuis une chaîne ISO/date, ou « — » si vide. */
export const dateFr = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
