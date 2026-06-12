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
  transpilePackages: ['@bordero/core', '@bordero/db', '@bordero/pdf'],
  serverExternalPackages: ['@react-pdf/renderer'],
  webpack: (config) => {
    // Les packages internes utilisent des imports ESM avec extension .js qui
    // pointent vers des sources .ts ; on l'indique à webpack.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      ...config.resolve.extensionAlias,
    };
    return config;
  },
};

export default nextConfig;
