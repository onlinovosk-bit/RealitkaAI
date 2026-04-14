"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sk">
      <body
        style={{
          background: "#050914",
          color: "#f0f9ff",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Nastala neočakávaná chyba
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#94a3b8", fontSize: "0.875rem" }}>
            Aplikácia narazila na problém. Skúste obnoviť stránku alebo sa vráťte neskôr.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.5rem", color: "#475569", fontSize: "0.75rem" }}>
              Kód chyby: {error.digest}
            </p>
          )}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(34,211,238,0.3)",
                background: "rgba(34,211,238,0.08)",
                color: "#22d3ee",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Skúsiť znova
            </button>
            <a
              href="/"
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#94a3b8",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Späť na úvod
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
