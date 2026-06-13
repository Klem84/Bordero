import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { PrintButton } from './print-button';

interface RouteRow {
  id: string;
  ordre_passage: number | null;
  urgence: boolean;
  fenetre: string | null;
  site_adresse: string | null;
  client_nom: string | null;
  prestation_label: string | null;
  duree_min: number | null;
  ouvrage_type: string | null;
  volume_estime_m3: number | null;
}

const FENETRE: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  precis: 'Heure précise',
};

function fmtDuree(min: number | null): string {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
function fmtVol(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1).replace('.', ',')} m³`;
}

export const metadata = { title: 'Feuille de route' };

export default async function FeuilleRoutePage({
  params,
}: {
  params: Promise<{ date: string; camion: string }>;
}) {
  const { date, camion } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: camData }, { data: orgData }, { data: rowsData }] = await Promise.all([
    supabase.from('camions').select('immatriculation, type').eq('id', camion).maybeSingle(),
    supabase.from('organisations').select('raison_sociale').eq('id', user?.orgId ?? '').maybeSingle(),
    supabase
      .from('v_planning_interventions')
      .select(
        'id, ordre_passage, urgence, fenetre, site_adresse, client_nom, prestation_label, duree_min, ouvrage_type, volume_estime_m3',
      )
      .eq('date_prevue', date)
      .eq('camion_id', camion)
      .order('ordre_passage'),
  ]);

  const cam = camData as { immatriculation: string; type: string } | null;
  const org = orgData as { raison_sociale: string } | null;
  const rows = (rowsData ?? []) as RouteRow[];

  const labelDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
  const volTotal = rows.reduce((s, r) => s + (r.volume_estime_m3 ?? 0), 0);
  const dureeTotal = rows.reduce((s, r) => s + (r.duree_min ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link
          href={`/app/planning?date=${date}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Planning
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">Feuille de route</h1>
            <p className="mt-1 text-sm capitalize text-ink-muted">{labelDate}</p>
          </div>
          <div className="text-right">
            {org ? <p className="text-sm font-medium text-ink">{org.raison_sociale}</p> : null}
            <p className="font-mono text-sm font-semibold text-ink">{cam?.immatriculation ?? '—'}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-6 text-sm text-ink-muted">
          <span>
            {rows.length} arrêt{rows.length > 1 ? 's' : ''}
          </span>
          <span>Volume estimé : {fmtVol(volTotal)}</span>
          <span>Durée estimée : {fmtDuree(dureeTotal)}</span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">Aucune intervention affectée à ce camion ce jour.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Client / Adresse</th>
                <th className="py-2 pr-2 font-medium">Prestation</th>
                <th className="py-2 pr-2 font-medium">Créneau</th>
                <th className="py-2 pr-2 text-right font-medium">Vol.</th>
                <th className="py-2 text-right font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-border align-top">
                  <td className="py-3 pr-2 font-mono font-semibold text-ink">{r.ordre_passage ?? idx + 1}</td>
                  <td className="py-3 pr-2">
                    <p className="font-medium text-ink">
                      {r.client_nom}
                      {r.urgence ? <span className="ml-2 text-xs font-semibold text-danger">URGENCE</span> : null}
                    </p>
                    {r.site_adresse ? <p className="text-ink-muted">{r.site_adresse}</p> : null}
                  </td>
                  <td className="py-3 pr-2 text-ink-muted">
                    {r.prestation_label ?? '—'}
                    {r.ouvrage_type ? (
                      <span className="block text-xs">{OUVRAGE_TYPE[r.ouvrage_type] ?? r.ouvrage_type}</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-2 text-ink-muted">{r.fenetre ? (FENETRE[r.fenetre] ?? r.fenetre) : '—'}</td>
                  <td className="py-3 pr-2 text-right tabular text-ink">{fmtVol(r.volume_estime_m3)}</td>
                  <td className="py-3 text-right tabular text-ink">{fmtDuree(r.duree_min)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-6 text-xs text-ink-muted">
          Signature chauffeur : _______________________ &nbsp;&nbsp; Heure de départ : ______ &nbsp;&nbsp; Heure de retour : ______
        </p>
      </div>
    </div>
  );
}
