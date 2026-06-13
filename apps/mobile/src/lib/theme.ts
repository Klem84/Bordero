/**
 * Thème de l'app chauffeur. Règles propres au terrain (CDC) : gants, plein
 * soleil, gros boutons. Contrastes francs, cibles tactiles ≥ 56px. Couleurs
 * dérivées des tokens de marque du back-office (pétrole profond).
 */
export const colors = {
  bg: '#eef3f4',
  surface: '#ffffff',
  surface2: '#e7eef0',
  ink: '#16262b',
  inkMuted: '#566a6f',
  border: '#cfdadd',
  brand: '#256b76',
  brandInk: '#0f3a41',
  onBrand: '#ffffff',
  success: '#1f8a5b',
  successSubtle: '#dcf1e6',
  warning: '#b8740a',
  warningSubtle: '#fbeccd',
  danger: '#c0392b',
  dangerSubtle: '#f8dcd8',
  sidebar: '#1d2f33',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  md: 12,
  lg: 16,
  pill: 999,
};

/** Hauteur minimale d'une cible tactile (utilisable avec des gants). */
export const TOUCH = 56;

export const text = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.ink },
  subtitle: { fontSize: 16, color: colors.inkMuted },
  body: { fontSize: 17, color: colors.ink },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.inkMuted },
  mono: { fontSize: 15, fontVariant: ['tabular-nums' as const], color: colors.ink },
};
