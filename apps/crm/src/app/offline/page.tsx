'use client'
export default function OfflinePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8"
      style={{ background: "#050914" }}
    >
      <div className="text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-bold"
          style={{ background: "#0A1628", border: "1px solid #112240", color: "#22D3EE" }}
        >
          R
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "#F0F9FF" }}>
          Ste offline
        </h1>
        <p className="mt-3 text-sm" style={{ color: "#64748B" }}>
          Skontrolujte internetové pripojenie a skúste znova.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.3)",
            color: "#22D3EE",
          }}
        >
          Skúsiť znova
        </button>
      </div>
    </main>
  );
}
