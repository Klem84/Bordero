'use client';

// Filet de sécurité racine : s'affiche si le layout principal lui-même échoue.
// Styles en ligne car ce composant remplace le layout (et donc l'import du CSS).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#eef3f4',
          color: '#16262b',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Une erreur inattendue est survenue</h1>
        <p style={{ marginTop: 8, color: '#566a6f', maxWidth: 420 }}>
          L&apos;application a rencontré un problème. Réessayez ; vos données ne sont pas affectées.
        </p>
        {error.digest ? (
          <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#566a6f' }}>
            Référence : {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 24,
            height: 40,
            padding: '0 16px',
            borderRadius: 10,
            border: 'none',
            background: '#256b76',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
