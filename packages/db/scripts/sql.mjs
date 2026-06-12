// Petit utilitaire pour exécuter du SQL sur la base staging (connexion directe).
// Usage : node packages/db/scripts/sql.mjs "select 1"
// Le mot de passe est lu dans .env.local à la racine (jamais en dur).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = process.argv[2];
if (!sql) {
  console.error('Fournir une requête SQL en argument.');
  process.exit(1);
}

await client.connect();
try {
  const res = await client.query(sql);
  if (Array.isArray(res)) {
    res.forEach((r) => console.log(JSON.stringify(r.rows)));
  } else {
    console.log(JSON.stringify(res.rows, null, 2));
  }
} finally {
  await client.end();
}
