/**
 * Matrice de temps de trajet routier via l'API Mapbox Matrix. Sert à alimenter
 * l'optimisation de tournée (2-opt) avec des durées réelles plutôt qu'à vol
 * d'oiseau. Repli silencieux : si le token est absent, s'il y a plus de 25 points
 * (limite Mapbox), ou en cas d'erreur réseau, renvoie null et l'appelant retombe
 * sur la distance haversine de @bordero/core.
 */

interface Point {
  lat: number;
  lng: number;
}

const MAX_POINTS = 25; // limite de l'API Matrix Mapbox (profil standard)
const cle = (p: Point) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;

/**
 * Renvoie une fonction de coût (durée routière en secondes) entre deux points,
 * ou null si Mapbox n'est pas utilisable (repli haversine côté appelant).
 */
export async function matriceTrajetMapbox(
  points: Point[],
): Promise<((a: Point, b: Point) => number) | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || points.length < 2 || points.length > MAX_POINTS) return null;

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}?annotations=duration&access_token=${token}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; durations?: Array<Array<number | null>> };
    if (json.code !== 'Ok' || !json.durations) return null;
    const durations = json.durations;

    // Index des points par coordonnée pour retrouver la cellule de la matrice.
    const indexParCle = new Map<string, number>();
    points.forEach((p, i) => indexParCle.set(cle(p), i));

    return (a: Point, b: Point): number => {
      const i = indexParCle.get(cle(a));
      const j = indexParCle.get(cle(b));
      if (i == null || j == null) return Number.POSITIVE_INFINITY;
      const v = durations[i]?.[j];
      return v == null ? Number.POSITIVE_INFINITY : v;
    };
  } catch {
    return null;
  }
}
