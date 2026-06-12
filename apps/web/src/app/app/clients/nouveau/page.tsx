'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { creerClientSite, type ClientFormState } from '../actions';

interface AdresseFeature {
  label: string;
  lng: number;
  lat: number;
}

const initial: ClientFormState = { error: null };

export default function NouveauClientPage() {
  const [state, action, pending] = useActionState(creerClientSite, initial);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AdresseFeature[]>([]);
  const [selected, setSelected] = useState<AdresseFeature | null>(null);
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
          (json.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
            label: f.properties.label,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          })),
        );
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }, [query, selected]);

  return (
    <div className="max-w-2xl">
      <Link href="/app/clients" className="text-sm text-slate-500 hover:underline">
        ← Retour aux clients
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-slate-900">Nouveau client</h1>

      <form action={action} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <div className="flex gap-3">
            {[
              { v: 'particulier', l: 'Particulier' },
              { v: 'professionnel', l: 'Professionnel' },
              { v: 'collectivite', l: 'Collectivité' },
              { v: 'syndic', l: 'Syndic' },
            ].map((opt, i) => (
              <label key={opt.v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="type" value={opt.v} defaultChecked={i === 0} /> {opt.l}
              </label>
            ))}
          </div>
        </div>

        <Field name="nom" label="Nom *" required />
        <div className="grid grid-cols-2 gap-4">
          <Field name="telephone" label="Téléphone" type="tel" />
          <Field name="email" label="Email" type="email" />
        </div>

        <div className="relative">
          <label htmlFor="adresse" className="mb-1 block text-sm font-medium text-slate-700">
            Adresse
          </label>
          <input
            id="adresse"
            name="adresse"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-bordero focus:ring-1 focus:ring-bordero"
          />
          {suggestions.length > 0 && !selected ? (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setQuery(s.label);
                      setSuggestions([]);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
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
            <p className="mt-1 text-xs text-green-600">Adresse géolocalisée ✓</p>
          ) : null}
        </div>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500 disabled:opacity-60"
          >
            {pending ? 'Création…' : 'Créer le client'}
          </button>
          <Link
            href="/app/clients"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-bordero focus:ring-1 focus:ring-bordero"
      />
    </div>
  );
}
