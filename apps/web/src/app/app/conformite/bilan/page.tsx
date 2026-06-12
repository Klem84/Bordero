import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { assembleBilan } from '@/lib/bilan';

export default async function BilanPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { annee: anneeParam } = await searchParams;
  const annee = anneeParam ? Number(anneeParam) : new Date().getFullYear();
  const user = await getCurrentUser();
  if (!user?.orgId) return null;

  const { agregats: a, agrement } = await assembleBilan(user.orgId, annee);

  return (
    <div className="max-w-3xl">
      <Link href="/app/conformite" className="text-sm text-slate-500 hover:underline">
        ← Conformité
      </Link>
      <div className="mb-6 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bilan annuel {annee}</h1>
          <p className="text-sm text-slate-500">
            Agrément {agrement.numero ?? '—'} ({agrement.departement ?? '—'}). À transmettre au préfet avant le 1er avril.
          </p>
        </div>
        <a
          href={`/app/conformite/bilan/export?annee=${annee}`}
          className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500"
        >
          Générer le bilan (PDF)
        </a>
      </div>

      <div
        className={
          'mb-6 rounded-xl border p-4 text-sm ' +
          (a.controles.complet
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-800')
        }
      >
        {a.controles.complet ? (
          <span>Bilan prêt : tous les bordereaux sont bouclés et cohérents. ✓</span>
        ) : (
          <span>
            À régulariser avant transmission : {a.controles.bordereauxNonBoucles} bordereau(x) non bouclé(s), écart
            pompé/dépoté {a.controles.ecartPompeDepotePct} %
            {a.controles.depassementQuota ? ', dépassement de quota' : ''}.
          </span>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Par commune</h2>
          {a.installationsParCommune.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {a.installationsParCommune.map((c) => (
                <li key={c.commune} className="flex justify-between">
                  <span>{c.commune}</span>
                  <span className="text-slate-500">
                    {c.nbInstallations} inst. · {c.volumeM3.toFixed(1)} m³
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Par filière</h2>
          {a.volumesParFiliere.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {a.volumesParFiliere.map((f) => (
                <li key={f.exutoire} className="flex justify-between">
                  <span>{f.exutoire}</span>
                  <span className="text-slate-500">{f.volumeM3.toFixed(1)} m³</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 flex gap-6 text-sm text-slate-600">
        <span>
          Total pompé : <strong>{a.totalPompeM3.toFixed(1)} m³</strong>
        </span>
        <span>
          Total dépoté : <strong>{a.totalDepoteM3.toFixed(1)} m³</strong>
        </span>
      </div>
    </div>
  );
}
