import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClotureForm } from '@/components/cloture-form';
import { FactureButton } from '@/components/facture-button';
import { INTERVENTION_STATUT, BORDEREAU_STATUT } from '@/lib/statuts';

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

export const metadata = { title: "Intervention" };

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
  const s = INTERVENTION_STATUT[inter.status] ?? { label: inter.status, tone: 'neutral' as const };

  return (
    <div className="max-w-3xl">
      <Link href="/app/interventions" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Interventions
      </Link>
      <PageHeader title="Intervention" subtitle={site?.adresse ?? '—'} actions={<Badge tone={s.tone}>{s.label}</Badge>} />

      <h2 className="mb-3 text-sm font-semibold text-ink">Bordereaux</h2>
      {bordereaux.length === 0 ? (
        <p className="mb-6 text-sm text-ink-muted">Aucun bordereau émis.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {bordereaux.map((b) => {
            const bs = BORDEREAU_STATUT[b.statut] ?? { label: b.statut, tone: 'neutral' as const };
            return (
              <Card key={b.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-mono font-medium">{b.numero}</span>
                <span className="flex items-center gap-2 text-ink-muted">
                  {b.type} <Badge tone={bs.tone}>{bs.label}</Badge>
                </span>
              </Card>
            );
          })}
        </ul>
      )}

      {CLOTURABLE.includes(inter.status) ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Clôture</h2>
          <ClotureForm interventionId={inter.id} />
        </section>
      ) : bordereaux.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Facturation</h2>
          <FactureButton interventionId={inter.id} />
        </section>
      ) : null}
    </div>
  );
}
