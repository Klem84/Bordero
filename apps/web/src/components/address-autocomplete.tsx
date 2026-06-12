'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Label, Input } from '@/components/ui/input';

interface AdresseFeature {
  label: string;
  lng: number;
  lat: number;
}

/**
 * Champ d'adresse avec autocomplétion + géocodage (API Adresse data.gouv).
 * Pose `adresse`, `lng`, `lat` comme champs de formulaire. En édition, l'adresse
 * initiale est affichée ; les coordonnées ne sont renvoyées que si l'utilisateur
 * resélectionne une suggestion (le serveur conserve sinon le point existant).
 */
export function AddressAutocomplete({
  label = 'Adresse',
  name = 'adresse',
  defaultValue = '',
  required,
  id = 'adresse',
}: {
  label?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
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
    <div className="relative">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        autoComplete="off"
        required={required}
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
  );
}
