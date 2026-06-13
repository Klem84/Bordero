import { notFound } from 'next/navigation';
import { Droplets } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ReservationForm } from './reservation-form';

interface OrgPublique {
  raison_sociale: string;
  reservation_active: boolean;
}

async function getOrg(slug: string): Promise<OrgPublique | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('rpc_org_publique', { p_slug: slug } as never);
  const rows = (data ?? []) as OrgPublique[];
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  return { title: org ? `Réserver une intervention · ${org.raison_sociale}` : 'Réservation' };
}

export default async function ReservationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) notFound();

  return (
    <main className="min-h-screen bg-surface-2/40 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <Droplets className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Demande d’intervention</p>
            <h1 className="text-xl font-semibold text-ink">{org.raison_sociale}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {org.reservation_active ? (
            <>
              <p className="mb-5 text-sm text-ink-muted">
                Décrivez votre besoin de vidange, curage ou assainissement. L’entreprise vous
                recontacte pour fixer un rendez-vous. Aucune création de compte n’est nécessaire.
              </p>
              <ReservationForm slug={slug} />
            </>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">
              Les réservations en ligne sont momentanément fermées. Merci de contacter directement
              l’entreprise par téléphone.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">Propulsé par Bordero</p>
      </div>
    </main>
  );
}
