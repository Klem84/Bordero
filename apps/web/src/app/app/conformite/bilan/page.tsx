import Link from 'next/link';
import { ArrowLeft, FileDown } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { assembleBilan } from '@/lib/bilan';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export default async function BilanPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { annee: anneeParam } = await searchParams;
  const annee = anneeParam ? Number(anneeParam) : new Date().getFullYear();
  const user = await getCurrentUser();
  if (!user?.orgId) return null;

  const { agregats: a, agrement } = await assembleBilan(user.orgId, annee);

  return (
    <div className="max-w-3xl">
      <Link href="/app/conformite" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Conformité
      </Link>
      <PageHeader
        title={`Bilan annuel ${annee}`}
        subtitle={`Agrément ${agrement.numero ?? '—'} (${agrement.departement ?? '—'}). À transmettre au préfet avant le 1er avril.`}
        actions={
          <a href={`/app/conformite/bilan/export?annee=${annee}`} className={buttonClasses('primary', 'md')}>
            <FileDown className="h-4 w-4" /> Générer le bilan (PDF)
          </a>
        }
      />

      <div
        className={cn(
          'mb-6 rounded-xl border p-4 text-sm',
          a.controles.complet
            ? 'border-success/30 bg-success-subtle text-success'
            : 'border-warning/30 bg-warning-subtle text-[oklch(0.5_0.13_70)]',
        )}
      >
        {a.controles.complet ? (
          'Bilan prêt : tous les bordereaux sont bouclés et cohérents.'
        ) : (
          <>
            À régulariser avant transmission : {a.controles.bordereauxNonBoucles} bordereau(x) non bouclé(s), écart
            pompé/dépoté {a.controles.ecartPompeDepotePct} %
            {a.controles.depassementQuota ? ', dépassement de quota' : ''}.
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Par commune</h2>
          {a.installationsParCommune.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune donnée.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {a.installationsParCommune.map((c) => (
                <li key={c.commune} className="flex justify-between">
                  <span className="text-ink">{c.commune}</span>
                  <span className="tabular text-ink-muted">
                    {c.nbInstallations} inst. · {c.volumeM3.toFixed(1)} m³
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Par filière</h2>
          {a.volumesParFiliere.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune donnée.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {a.volumesParFiliere.map((f) => (
                <li key={f.exutoire} className="flex justify-between">
                  <span className="text-ink">{f.exutoire}</span>
                  <span className="tabular text-ink-muted">{f.volumeM3.toFixed(1)} m³</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 flex gap-6 text-sm text-ink-muted">
        <span>
          Total pompé : <strong className="tabular text-ink">{a.totalPompeM3.toFixed(1)} m³</strong>
        </span>
        <span>
          Total dépoté : <strong className="tabular text-ink">{a.totalDepoteM3.toFixed(1)} m³</strong>
        </span>
      </div>
    </div>
  );
}
