import type { Tone } from '@/components/ui/badge';

export const INTERVENTION_STATUT: Record<string, { label: string; tone: Tone }> = {
  BROUILLON: { label: 'Brouillon', tone: 'neutral' },
  PLANIFIEE: { label: 'Planifiée', tone: 'info' },
  EN_ROUTE: { label: 'En route', tone: 'info' },
  SUR_SITE: { label: 'Sur site', tone: 'brand' },
  TERMINEE: { label: 'Terminée', tone: 'success' },
  IMPOSSIBLE: { label: 'Impossible', tone: 'danger' },
  CLOTUREE: { label: 'Clôturée', tone: 'success' },
  ANNULEE: { label: 'Annulée', tone: 'danger' },
};

export const BORDEREAU_STATUT: Record<string, { label: string; tone: Tone }> = {
  EMIS: { label: 'Émis', tone: 'info' },
  SIGNE_CLIENT: { label: 'Signé client', tone: 'warning' },
  DEPOSE: { label: 'Déposé', tone: 'warning' },
  BOUCLE: { label: 'Bouclé', tone: 'success' },
  ANNULE: { label: 'Annulé', tone: 'danger' },
};

export const FACTURE_STATUT: Record<string, { label: string; tone: Tone }> = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  emise: { label: 'Émise', tone: 'info' },
  envoyee: { label: 'Envoyée', tone: 'info' },
  payee: { label: 'Payée', tone: 'success' },
  partiellement_payee: { label: 'Part. payée', tone: 'warning' },
  en_retard: { label: 'En retard', tone: 'danger' },
  irrecouvrable: { label: 'Irrécouvrable', tone: 'danger' },
};

export const CLIENT_TYPE: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  collectivite: 'Collectivité',
  syndic: 'Syndic',
};

export const OUVRAGE_TYPE: Record<string, string> = {
  FOSSE_SEPTIQUE: 'Fosse septique',
  FOSSE_TOUTES_EAUX: 'Fosse toutes eaux',
  MICRO_STATION: 'Micro-station',
  BAC_A_GRAISSE: 'Bac à graisse',
  SEPARATEUR_HYDROCARBURES: 'Séparateur hydrocarbures',
  POSTE_RELEVAGE: 'Poste de relevage',
  CUVE_FIOUL: 'Cuve à fioul',
  CANALISATION: 'Canalisation',
  AUTRE: 'Autre',
};
