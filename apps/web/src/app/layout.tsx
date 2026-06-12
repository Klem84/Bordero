import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bordero',
  description: 'Du devis au bordereau réglementaire, sans papier, depuis le camion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
