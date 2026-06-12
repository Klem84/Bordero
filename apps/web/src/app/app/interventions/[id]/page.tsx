import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClotureForm } from '@/components/cloture-form';

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: 'Brouillon',
  PLANIFIEE: 'Planifiée',
  EN_ROUTE: 'En route',
  SUR_SITE: 'Sur site',
  TERMINEE: 'Terminée',
  IMPOSSIBLE: 'Impossible',
  CLOTUREE: 'Clôturée',
  ANNULEE: 'Annulée',
};

interface InterventionDetail {
  id: string;
  status: string;
  date_prevue: string | null;
  site_id: string;
}
interface BordereauLite {
  id: string;
  numero: string;
  type: string;
  statut: string;
}

const CLOTURABLE = ['BROUILLON', 'PLANIFIEE', 'EN_ROUTE', 'SUR_SITE'];

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: intData } = await supabase
    .from('interventions')
    .select('id, status, date_prevue, site_id')
    .eq('id', id)
    .maybeSingle();
  const inter = intData as InterventionDetail | null;
  if (!inter) notFound();

  const { data: siteData } = await supabase.from('sites').select('adresse').eq('id', inter.site_id).maybeSingle();
  const site = siteData as { adresse: string } | null;

  const { data: bordData } = await supabase
    .from('bordereaux')
    .select('id, numero, type, statut')
    .eq('intervention_id', id);
  const bordereaux = (bordData ?? []) as BordereauLite[];

  return (
    <div className="max-w-3xl">
      <Link href="/app/interventions" className="text-sm text-slate-500 hover:underline">
        ← Interventions
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-900">Intervention</h1>
      <p className="mb-6 text-sm text-slate-500">
        {site?.adresse ?? '—'} · statut : {STATUT_LABEL[inter.status] ?? inter.status}
      </p>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Bordereaux</h2>
        {bordereaux.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun bordereau émis.</p>
        ) : (
          <ul className="space-y-2">
            {bordereaux.map((b) => (
              <li key={b.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <span className="font-medium">{b.numero}</span> — {b.type} ({b.statut})
              </li>
            ))}
          </ul>
        )}
      </section>

      {CLOTURABLE.includes(inter.status) ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Clôture</h2>
          <ClotureForm interventionId={inter.id} />
        </section>
      ) : null}
    </div>
  );
}
