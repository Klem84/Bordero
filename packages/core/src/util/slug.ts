/**
 * Normalise un identifiant de lien public (slug d'organisation pour le portail
 * de réservation) : minuscules, sans accents, uniquement [a-z0-9-], sans tirets
 * de bord ni doublons. Règle partagée pour rester cohérente entre back-office et
 * d'éventuels autres appelants.
 */
export function normaliserSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques (é -> e)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
