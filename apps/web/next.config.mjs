import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Charge les variables depuis le .env.local de la racine du monorepo
// (source unique de vérité, pas de duplication des secrets par app).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv({ path: resolve(root, '.env.local') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bordero/core', '@bordero/db'],
};

export default nextConfig;
