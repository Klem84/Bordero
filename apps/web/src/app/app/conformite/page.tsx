import Link from 'next/link';
import { FileText } from 'lucide-react';
import { statutEcheance, statutQuota } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface AgrementRow {
  id: string;
  numero: string;
  departement_code: string;
  departement_libelle: string | null;
  date_echeance: string;
  quantite_max_annuelle_m3: number | null;
  statut: string;
}

const SEUIL_BAR: Record<string, string> = {
  ok: 'bg-success',
  information: 'bg-brand',
  avertissement: 'bg-warning',
  critique: 'bg-danger',
};
const ECHEANCE_INK: Record<string, string> = {
  a_jour: 'text-success',
  proche: 'text-warning',
  depassee: 'text-danger',
  inconnue: 'text-ink-muted',
};

export default async function ConformitePage() {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const yearStart = `${now.getFullYear()}-01-01`;

  const { data: agrData } = await supabase
    .from('agrements')
    .select('id, numero, departement_code, departement_libelle, date_echeance, quantite_max_annuelle_m3, statut')
    .order('date_echeance');
  const agrements = (agrData ?? []) as AgrementRow[];

  const { data: bouclesData } = await supabase
    .from('bordereaux')
    .select('quantite_pompee_m3')
    .eq('statut', 'BOUCLE')
    .gte('created_at', yearStart);
  const totalM3 = ((bouclesData ?? []) as { quantite_pompee_m3: number | null }[]).reduce(
    (s, b) => s + Number(b.quantite_pompee_m3 ?? 0),
    0,
  );

  const { data: regulData } = await supabase
    .from('bordereaux')
    .select('id, numero, statut, created_at')
    .in('statut', ['SIGNE_CLIENT', 'DEPOSE']);
  const aRegulariser = (
    (regulData ?? []) as { id: string; numero: string; statut: string; created_at: string }[]
  ).filter((b) => Date.now() - new Date(b.created_at).getTime() > 48 * 3600 * 1000);

  return (
    <div>
      <PageHeader
        title="Conformité"
        subtitle="Agréments, quotas et bordereaux à régulariser."
        actions={
          <>
            <Link href="/app/conformite/bilan" className={buttonClasses('primary', 'md')}>
              <FileText className="h-4 w-4" /> Bilan annuel
            </Link>
            <Link href="/app/conformite/registre" className={buttonClasses('secondary', 'md')}>
              Registre
            </Link>
          </>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Agréments préfectoraux</h2>
        {agrements.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun agrément enregistré.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agrements.map((a) => {
              const q = statutQuota(totalM3, a.quantite_max_annuelle_m3);
              const ech = statutEcheance(a.date_echeance, nowIso);
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink">{a.numero}</span>
                    <span className="text-xs text-ink-muted">
                      {a.departement_libelle ?? a.departement_code} ({a.departement_code})
                    </span>
                  </div>
                  <p className={cn('mt-1 text-xs', ECHEANCE_INK[ech])}>
                    Échéance : {new Date(a.date_echeance).toLocaleDateString('fr-FR')}
                  </p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
                      <span>Quota annuel</span>
                      <span className="tabular">
                        {totalM3.toFixed(1)} / {a.quantite_max_annuelle_m3 ?? '—'} m³ ({q.pct} %)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-500', SEUIL_BAR[q.seuil])}
                        style={{ width: `${Math.min(100, q.pct)}%` }}
                      />
                    </div>
                    {q.seuil === 'avertissement' ? (
                      <p className="mt-1.5 text-xs text-warning">Seuil 85 % atteint : envisager une demande de modification.</p>
                    ) : null}
                    {q.seuil === 'critique' ? (
                      <p className="mt-1.5 text-xs text-danger">Quota atteint : nouvelles interventions ANC à confirmer.</p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Bordereaux à régulariser</h2>
        <Card className="p-5">
          {aRegulariser.length === 0 ? (
            <p className="text-sm text-success">Aucun bordereau en attente depuis plus de 48 h.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {aRegulariser.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span className="font-mono font-medium">{b.numero}</span>
                  <span className="text-warning">{b.statut}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
