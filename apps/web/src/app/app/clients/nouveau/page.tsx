'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { creerClientSite, type ClientFormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/input';

interface AdresseFeature {
  label: string;
  lng: number;
  lat: number;
}

const initial: ClientFormState = { error: null };

export default function NouveauClientPage() {
  const sp = useSearchParams();
  // Préremplissage depuis une demande de réservation convertie.
  const preNom = sp.get('nom') ?? '';
  const preTel = sp.get('telephone') ?? '';
  const preEmail = sp.get('email') ?? '';
  const preAdresse = sp.get('adresse') ?? '';
  const preLng = sp.get('lng');
  const preLat = sp.get('lat');

  const [state, action, pending] = useActionState(creerClientSite, initial);
  const [query, setQuery] = useState(preAdresse);
  const [suggestions, setSuggestions] = useState<AdresseFeature[]>([]);
  const [selected, setSelected] = useState<AdresseFeature | null>(
    preAdresse && preLng && preLat ? { label: preAdresse, lng: Number(preLng), lat: Number(preLat) } : null,
  );
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected && selected.label === query) return;
    if (query.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
        );
        const json = await res.json();
        setSuggestions(
          (json.features ?? []).map(
            (f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
              label: f.properties.label,
              lng: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
            }),
          ),
        );
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }, [query, selected]);

  return (
    <div className="max-w-2xl">
      <Link href="/app/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Nouveau client</h1>

      <form action={action} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-card">
        <div>
          <Label>Type</Label>
          <div className="flex flex-wrap gap-4">
            {[
              { v: 'particulier', l: 'Particulier' },
              { v: 'professionnel', l: 'Professionnel' },
              { v: 'collectivite', l: 'Collectivité' },
              { v: 'syndic', l: 'Syndic' },
            ].map((opt, i) => (
              <label key={opt.v} className="flex items-center gap-2 text-sm text-ink">
                <input type="radio" name="type" value={opt.v} defaultChecked={i === 0} className="accent-brand" />
                {opt.l}
              </label>
            ))}
          </div>
        </div>

        <Field label="Nom" htmlFor="nom">
          <Input id="nom" name="nom" required defaultValue={preNom} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone" htmlFor="telephone">
            <Input id="telephone" name="telephone" type="tel" defaultValue={preTel} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={preEmail} />
          </Field>
        </div>

        <Field label="SIRET" htmlFor="siret" hint="Pour les professionnels et collectivités (14 chiffres).">
          <Input id="siret" name="siret" inputMode="numeric" placeholder="123 456 789 00012" />
        </Field>

        <div className="relative">
          <Label htmlFor="adresse">Adresse</Label>
          <Input
            id="adresse"
            name="adresse"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />
          {suggestions.length > 0 && !selected ? (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-card-hover">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setQuery(s.label);
                      setSuggestions([]);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-2"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input type="hidden" name="lng" value={selected?.lng ?? ''} />
          <input type="hidden" name="lat" value={selected?.lat ?? ''} />
          {selected ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> Adresse géolocalisée
            </p>
          ) : null}
        </div>

        {state?.error ? (
          <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Création…' : 'Créer le client'}
          </Button>
          <Link href="/app/clients" className="inline-flex items-center rounded-lg border border-border px-4 text-sm font-medium text-ink-muted hover:bg-surface-2">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
