import Link from 'next/link';
import { Truck, MapPin, Clock, ArrowUp, ArrowDown, X, Printer, Waypoints } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { DateNav } from './date-nav';
import { AffecterForm } from './affecter-form';
import { desaffecterIntervention, deplacerIntervention, optimiserTourneeAction } from './actions';

interface PlanningRow {
  id: string;
  status: string;
  date_prevue: string | null;
  ordre_passage: number | null;
  urgence: boolean;
  tournee_id: string | null;
  camion_id: string | null;
  site_adresse: string | null;
  client_nom: string | null;
  prestation_label: string | null;
  duree_min: number | null;
  ouvrage_type: string | null;
  volume_estime_m3: number | null;
}

interface CamionRow {
  id: string;
  immatriculation: string;
  type: string;
  capacite_citerne_m3: number;
}

const CAMION_TYPE: Record<string, string> = {
  hydrocureur: 'Hydrocureur',
  combine: 'Combiné',
  citerne_simple: 'Citerne',
  fourgon: 'Fourgon',
};

function fmtDuree(min: number | null): string {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

function fmtVol(n: number | null): string {
  if (n == null) return '—';
  return `${n.toFixed(1).replace('.', ',')} m³`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function InterventionMeta({ i }: { i: PlanningRow }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {i.ouvrage_type ? (
        <Badge tone="neutral">{OUVRAGE_TYPE[i.ouvrage_type] ?? i.ouvrage_type}</Badge>
      ) : null}
      <Badge tone="neutral">
        <Clock className="h-3 w-3" /> {fmtDuree(i.duree_min)}
      </Badge>
      {i.volume_estime_m3 != null ? <Badge tone="neutral">{fmtVol(i.volume_estime_m3)}</Badge> : null}
    </div>
  );
}

export const metadata = { title: "Planning" };

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

  const labelDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(selectedDate + 'T00:00:00Z'));

  const supabase = await createClient();

  const [{ data: camData }, { data: dayData }, { data: queueData }] = await Promise.all([
    supabase
      .from('camions')
      .select('id, immatriculation, type, capacite_citerne_m3')
      .eq('actif', true)
      .order('immatriculation'),
    supabase
      .from('v_planning_interventions')
      .select('*')
      .eq('date_prevue', selectedDate)
      .not('tournee_id', 'is', null)
      .order('ordre_passage'),
    supabase
      .from('v_planning_interventions')
      .select('*')
      .is('tournee_id', null)
      .order('urgence', { ascending: false }),
  ]);

  const camions = (camData ?? []) as CamionRow[];
  const planifiees = (dayData ?? []) as PlanningRow[];
  const queue = (queueData ?? []) as PlanningRow[];

  const parCamion = new Map<string, PlanningRow[]>();
  for (const i of planifiees) {
    if (!i.camion_id) continue;
    const arr = parCamion.get(i.camion_id) ?? [];
    arr.push(i);
    parCamion.set(i.camion_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Planning"
        subtitle="Affectez les interventions aux camions, jour par jour."
        actions={
          <DateNav
            dateValue={selectedDate}
            label={labelDate}
            prevHref={`/app/planning?date=${shiftDate(selectedDate, -1)}`}
            nextHref={`/app/planning?date=${shiftDate(selectedDate, 1)}`}
            todayHref="/app/planning"
            isToday={selectedDate === today}
          />
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* File d'attente */}
        <Card className="w-full shrink-0 lg:w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">File d&apos;attente</h2>
            <Badge tone={queue.length > 0 ? 'warning' : 'neutral'}>{queue.length}</Badge>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {queue.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-muted">
                Tout est planifié. Les nouvelles commandes sans date arrivent ici.
              </p>
            ) : (
              queue.map((i) => (
                <div key={i.id} className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{i.client_nom}</p>
                    {i.urgence ? <Badge tone="danger">Urgence</Badge> : null}
                  </div>
                  {i.site_adresse ? (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-ink-muted">
                      <MapPin className="mt-px h-3 w-3 shrink-0" /> {i.site_adresse}
                    </p>
                  ) : null}
                  <InterventionMeta i={i} />
                  {camions.length > 0 ? (
                    <AffecterForm interventionId={i.id} date={selectedDate} camions={camions} />
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Tableau des camions du jour */}
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {camions.length === 0 ? (
            <Card className="col-span-full">
              <p className="px-5 py-10 text-center text-sm text-ink-muted">
                Aucun camion actif. Ajoutez un camion au parc pour planifier les tournées.
              </p>
            </Card>
          ) : (
            camions.map((cam) => {
              const items = parCamion.get(cam.id) ?? [];
              const volTotal = items.reduce((s, i) => s + (i.volume_estime_m3 ?? 0), 0);
              const dureeTotal = items.reduce((s, i) => s + (i.duree_min ?? 0), 0);
              const ratio = cam.capacite_citerne_m3 > 0 ? volTotal / cam.capacite_citerne_m3 : 0;
              const barTone =
                ratio >= 1 ? 'bg-danger' : ratio >= 0.85 ? 'bg-warning' : 'bg-brand';
              return (
                <Card key={cam.id} className="flex flex-col">
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-brand" />
                      <span className="font-mono text-sm font-semibold text-ink">
                        {cam.immatriculation}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {CAMION_TYPE[cam.type] ?? cam.type}
                      </span>
                      {items.length > 0 ? (
                        <div className="ml-auto flex items-center gap-1">
                          {items.length > 1 ? (
                            <form action={optimiserTourneeAction}>
                              <input type="hidden" name="tournee_id" value={items[0]?.tournee_id ?? ''} />
                              <button
                                type="submit"
                                aria-label="Optimiser l'ordre de passage"
                                title="Optimiser l'ordre (trajet le plus court)"
                                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-brand-subtle hover:text-brand"
                              >
                                <Waypoints className="h-4 w-4" />
                              </button>
                            </form>
                          ) : null}
                          <Link
                            href={`/app/planning/${selectedDate}/${cam.id}`}
                            aria-label="Feuille de route imprimable"
                            title="Feuille de route"
                            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span>
                          Citerne {fmtVol(volTotal)} / {fmtVol(cam.capacite_citerne_m3)}
                        </span>
                        <span>{fmtDuree(dureeTotal)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${barTone}`}
                          style={{ width: `${Math.min(100, ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    {items.length === 0 ? (
                      <p className="px-1 py-6 text-center text-xs text-ink-muted">
                        Aucune intervention affectée.
                      </p>
                    ) : (
                      items.map((i, idx) => (
                        <div key={i.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-xs font-semibold text-brand-ink">
                              {i.ordre_passage ?? idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-ink">{i.client_nom}</p>
                                {i.urgence ? <Badge tone="danger">Urgence</Badge> : null}
                              </div>
                              {i.site_adresse ? (
                                <p className="mt-0.5 flex items-start gap-1 text-xs text-ink-muted">
                                  <MapPin className="mt-px h-3 w-3 shrink-0" /> {i.site_adresse}
                                </p>
                              ) : null}
                              <InterventionMeta i={i} />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1">
                            <form action={deplacerIntervention}>
                              <input type="hidden" name="intervention_id" value={i.id} />
                              <input type="hidden" name="sens" value={-1} />
                              <button
                                type="submit"
                                disabled={idx === 0}
                                aria-label="Monter dans l'ordre de passage"
                                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                            </form>
                            <form action={deplacerIntervention}>
                              <input type="hidden" name="intervention_id" value={i.id} />
                              <input type="hidden" name="sens" value={1} />
                              <button
                                type="submit"
                                disabled={idx === items.length - 1}
                                aria-label="Descendre dans l'ordre de passage"
                                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </form>
                            <form action={desaffecterIntervention}>
                              <input type="hidden" name="intervention_id" value={i.id} />
                              <button
                                type="submit"
                                aria-label="Retirer de la tournée"
                                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
