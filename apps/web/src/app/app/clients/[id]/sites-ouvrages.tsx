'use client';

import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { supprimerSite, supprimerOuvrage } from '../actions';
import { SiteForm, type SiteData } from './site-form';
import { OuvrageForm, type OuvrageData } from './ouvrage-form';

export interface SiteWithOuvrages extends SiteData {
  ouvrages: OuvrageData[];
}

function DeleteForm({
  action,
  hidden,
  confirmLabel,
  ariaLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  confirmLabel: string;
  ariaLabel: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmLabel)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        aria-label={ariaLabel}
        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

function IconButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

export function SitesOuvrages({
  clientId,
  sites,
}: {
  clientId: string;
  sites: SiteWithOuvrages[];
}) {
  const [addingSite, setAddingSite] = useState(false);
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [ouvrageForm, setOuvrageForm] = useState<{ siteId: string; ouvrageId: string | null } | null>(
    null,
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Sites et ouvrages</h2>
        {!addingSite ? (
          <Button variant="secondary" size="sm" onClick={() => setAddingSite(true)}>
            <Plus className="h-4 w-4" /> Ajouter un site
          </Button>
        ) : null}
      </div>

      {addingSite ? (
        <div className="mb-4">
          <SiteForm clientId={clientId} onDone={() => setAddingSite(false)} />
        </div>
      ) : null}

      <div className="space-y-4">
        {sites.length === 0 && !addingSite ? (
          <p className="text-sm text-ink-muted">
            Aucun site enregistré. Ajoutez un site pour y rattacher des ouvrages.
          </p>
        ) : (
          sites.map((site) => (
            <Card key={site.id} className="p-4">
              {editingSite === site.id ? (
                <SiteForm clientId={clientId} site={site} onDone={() => setEditingSite(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-start gap-1.5 font-medium text-ink">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" /> {site.adresse}
                    </p>
                    {site.instructions_acces ? (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-muted">
                        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {site.instructions_acces}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton ariaLabel="Modifier le site" onClick={() => setEditingSite(site.id)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <DeleteForm
                      action={supprimerSite}
                      hidden={{ site_id: site.id, client_id: clientId }}
                      ariaLabel="Supprimer le site"
                      confirmLabel="Supprimer ce site et ses ouvrages ? Cette action est définitive."
                    />
                  </div>
                </div>
              )}

              <ul className="mt-3 space-y-2 border-t border-border pt-3">
                {site.ouvrages.length > 0 ? (
                  site.ouvrages.map((o) => {
                    const enRetard = o.date_prochaine_echeance
                      ? new Date(o.date_prochaine_echeance) < new Date()
                      : false;
                    if (ouvrageForm?.ouvrageId === o.id) {
                      return (
                        <li key={o.id}>
                          <OuvrageForm
                            clientId={clientId}
                            siteId={site.id}
                            ouvrage={o}
                            onDone={() => setOuvrageForm(null)}
                          />
                        </li>
                      );
                    }
                    return (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"
                      >
                        <span className="font-medium text-ink">
                          {OUVRAGE_TYPE[o.type] ?? o.type}
                        </span>
                        {o.volume_nominal_litres ? <span>· {o.volume_nominal_litres} L</span> : null}
                        {o.periodicite_mois ? <span>· tous les {o.periodicite_mois} mois</span> : null}
                        {o.date_prochaine_echeance ? (
                          <Badge tone={enRetard ? 'warning' : 'neutral'}>
                            Échéance{' '}
                            {new Date(o.date_prochaine_echeance).toLocaleDateString('fr-FR')}
                          </Badge>
                        ) : null}
                        <span className="ml-auto flex items-center gap-1">
                          <IconButton
                            ariaLabel="Modifier l'ouvrage"
                            onClick={() => setOuvrageForm({ siteId: site.id, ouvrageId: o.id })}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <DeleteForm
                            action={supprimerOuvrage}
                            hidden={{ ouvrage_id: o.id, client_id: clientId }}
                            ariaLabel="Supprimer l'ouvrage"
                            confirmLabel="Supprimer cet ouvrage ?"
                          />
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm italic text-ink-muted">Aucun ouvrage.</li>
                )}

                {ouvrageForm?.siteId === site.id && ouvrageForm.ouvrageId === null ? (
                  <li>
                    <OuvrageForm
                      clientId={clientId}
                      siteId={site.id}
                      onDone={() => setOuvrageForm(null)}
                    />
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      onClick={() => setOuvrageForm({ siteId: site.id, ouvrageId: null })}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      <Plus className="h-4 w-4" /> Ajouter un ouvrage
                    </button>
                  </li>
                )}
              </ul>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
