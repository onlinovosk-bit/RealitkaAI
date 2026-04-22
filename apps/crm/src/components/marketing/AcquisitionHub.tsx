"use client";

import { useState, useCallback } from "react";
import {
  Calculator,
  Eye,
  Users,
  CheckCircle,
  Zap,
  Shield,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import type {
  PropertyEstimate,
  NeighborAlert,
  ModuleStatus,
} from "@/types/acquisition-hub";

// ─── Demo dáta pre Neighborhood Watch ─────────────────────────────────────
const DEMO_NEIGHBORS: NeighborAlert[] = [
  {
    id: "1",
    address: "Sabinovská 14",
    eventType: "price_drop",
    changeAmount: -7500,
    daysAgo: 2,
    isUrgent: true,
  },
  {
    id: "2",
    address: "Sabinovská 8",
    eventType: "new_listing",
    daysAgo: 5,
    isUrgent: false,
  },
  {
    id: "3",
    address: "Sabinovská 22",
    eventType: "sold",
    daysAgo: 12,
    isUrgent: false,
  },
];

const EVENT_LABELS: Record<NeighborAlert["eventType"], string> = {
  price_drop:     "Zníženie ceny",
  new_listing:    "Nová ponuka",
  sold:           "Predaná",
  price_increase: "Zvýšenie ceny",
};

const EVENT_COLORS: Record<NeighborAlert["eventType"], string> = {
  price_drop:     "#FCA5A5",
  new_listing:    "#67E8F9",
  sold:           "#34D399",
  price_increase: "#FCD34D",
};

// ─── Formát ceny ──────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Trend ikona ──────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: PropertyEstimate["trend"] }) {
  if (trend === "rising")  return <TrendingUp  size={14} style={{ color: "#34D399" }} />;
  if (trend === "falling") return <TrendingDown size={14} style={{ color: "#FCA5A5" }} />;
  return <Minus size={14} style={{ color: "#94A3B8" }} />;
}

// ─── Module 1: AI Odhadca ──────────────────────────────────────────────────
function AiOdhadca() {
  const [address, setAddress]     = useState("Sabinovská 12, Prešov");
  const [sqm, setSqm]             = useState(75);
  const [status, setStatus]       = useState<ModuleStatus>("idle");
  const [estimate, setEstimate]   = useState<PropertyEstimate | null>(null);
  const [email, setEmail]         = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleCalculate = useCallback(async () => {
    if (address.trim().length < 5) {
      setError("Zadajte platnú adresu.");
      return;
    }
    setError(null);
    setStatus("calculating");

    try {
      const res = await fetch("/api/demo/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, sqm }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Chyba servera.");
      }

      const data: PropertyEstimate = await res.json();
      setEstimate(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznáma chyba.");
      setStatus("error");
    }
  }, [address, sqm]);

  const handleEmailSend = useCallback(async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Zadajte platný email.");
      return;
    }
    setError(null);
    setStatus("email_pending");

    try {
      const res = await fetch("/api/demo/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          address,
          source: "ai_odhadca",
          estimatedPrice: estimate?.estimatedPrice,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Chyba servera.");
      }

      setEmailSent(true);
      setStatus("email_sent");

      // GA4 event – tiché zlyhanie pri ad blockeri
      if (typeof window !== "undefined" && typeof (window as { gtag?: unknown }).gtag === "function") {
        (window as { gtag: (...args: unknown[]) => void }).gtag("event", "demo_lead_captured", {
          source: "ai_odhadca",
          estimated_price: estimate?.estimatedPrice ?? 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznáma chyba.");
      setStatus("done");
    }
  }, [email, address, estimate]);

  return (
    <div
      className="rounded-3xl p-8 relative overflow-hidden"
      style={{ background: "#0C0C14", border: "1px solid rgba(59,130,246,0.30)" }}
    >
      <div
        className="absolute top-0 right-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl"
        style={{
          background: "rgba(59,130,246,0.15)",
          color: "#93C5FD",
          borderLeft: "1px solid rgba(59,130,246,0.30)",
          borderBottom: "1px solid rgba(59,130,246,0.30)",
        }}
      >
        Lead Magnet
      </div>

      <Calculator className="mb-6" size={36} style={{ color: "#3B82F6" }} />
      <h2 className="text-2xl font-bold text-white mb-2">1. AI Odhadca 3.0</h2>
      <p className="text-sm mb-6" style={{ color: "#64748B" }}>
        Mení anonymných návštevníkov na overené kontakty cez prediktívnu analýzu ceny.
      </p>

      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                 style={{ color: "#3B82F6" }}>
            Adresa nehnuteľnosti
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={status === "calculating"}
            className="w-full px-4 py-3 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#F0F9FF",
              outline: "none",
            }}
            placeholder="Napr. Hlavná 1, Košice"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                 style={{ color: "#94A3B8" }}>
            Výmera: <span style={{ color: "#F0F9FF" }}>{sqm} m²</span>
          </label>
          <input
            type="range" min={30} max={300} step={5}
            value={sqm}
            onChange={(e) => setSqm(Number(e.target.value))}
            disabled={status === "calculating"}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "#334155" }}>
            <span>30 m²</span><span>300 m²</span>
          </div>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg"
             style={{ background: "rgba(239,68,68,0.08)", color: "#FCA5A5" }}>
            ⚠ {error}
          </p>
        )}

        {estimate && status !== "idle" && status !== "calculating" && (
          <div className="rounded-xl p-4 space-y-2"
               style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#64748B" }}>Odhadovaná cena</span>
              <div className="flex items-center gap-1.5">
                <TrendIcon trend={estimate.trend} />
                <span className="text-xl font-black" style={{ color: "#93C5FD" }}>
                  {formatPrice(estimate.estimatedPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: "#475569" }}>
              <span>{estimate.pricePerSqm} €/m²</span>
              <span>Na základe {estimate.comparables} porovnaní</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#34D399" }}>
              <CheckCircle size={12} />
              <span>
                Spoľahlivosť:{" "}
                {estimate.confidence === "high" ? "Vysoká" :
                 estimate.confidence === "medium" ? "Stredná" : "Nízka"}
              </span>
            </div>
          </div>
        )}

        {status === "done" && !emailSent && (
          <div className="pt-2">
            <p className="text-xs mb-3" style={{ color: "#64748B" }}>
              Zadajte email pre stiahnutie AI Reportu s predikciou na 6 mesiacov.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.sk"
                className="flex-1 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(59,130,246,0.30)",
                  color: "#F0F9FF",
                  outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleEmailSend(); }}
              />
              <button
                onClick={() => void handleEmailSend()}
                className="px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{ background: "#22C55E", color: "#050914" }}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {emailSent && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#34D399" }}>
            <CheckCircle size={16} />
            <span>Report odoslaný! Skontrolujte email.</span>
          </div>
        )}

        {(status === "idle" || status === "error") && (
          <button
            onClick={() => void handleCalculate()}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(37,99,235,0.30)",
            }}
          >
            VYPOČÍTAŤ TRHOVÚ CENU
          </button>
        )}

        {status === "calculating" && (
          <button
            disabled
            className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: "rgba(37,99,235,0.20)", color: "#93C5FD" }}
          >
            <Loader2 size={16} className="animate-spin" />
            Analyzujem trh...
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Module 2: Neighborhood Watch ─────────────────────────────────────────
function NeighborhoodWatch() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      className="rounded-3xl p-8"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <Eye className="mb-6" size={36} style={{ color: "#EF4444" }} />
      <h2 className="text-2xl font-bold text-white mb-2">2. Neighborhood Watch</h2>
      <p className="text-sm mb-6" style={{ color: "#64748B" }}>
        Sledovanie pohybu cien u susedov. Udrží klienta vo vašom ekosystéme
        mesiace pred predajom.
      </p>

      <div className="space-y-3">
        {DEMO_NEIGHBORS.map((neighbor) => (
          <button
            key={neighbor.id}
            onClick={() => setExpanded(expanded === neighbor.id ? null : neighbor.id)}
            className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: neighbor.isUrgent ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
              border: neighbor.isUrgent ? "1px solid rgba(239,68,68,0.20)" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{neighbor.address}</p>
                <p className="text-[10px] mt-0.5" style={{ color: EVENT_COLORS[neighbor.eventType] }}>
                  {EVENT_LABELS[neighbor.eventType]}
                  {neighbor.changeAmount != null && ` ${neighbor.changeAmount > 0 ? "+" : ""}${neighbor.changeAmount.toLocaleString("sk-SK")} €`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: "#334155" }}>
                  pred {neighbor.daysAgo}d
                </span>
                {neighbor.isUrgent && <Zap size={12} style={{ color: "#FCD34D" }} />}
              </div>
            </div>
            {expanded === neighbor.id && (
              <div className="mt-3 pt-3 text-xs"
                   style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#64748B" }}>
                AI analýza: Táto zmena môže ovplyvniť hodnotu vašej nehnuteľnosti
                o ±3–5&nbsp;%. Odporúčame kontaktovať klienta v lokalite.
              </div>
            )}
          </button>
        ))}

        <div className="mt-4 rounded-xl p-3"
             style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[11px]" style={{ color: "#FCA5A5" }}>
            <strong>🔴 AI Signál:</strong> 3 susedia z vášho zoznamu sledujú
            ponuku konkurencie. Ideálny čas na opätovný kontakt.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Module 3: Digital Twin ────────────────────────────────────────────────
function DigitalTwin() {
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  // Stabilná hodnota — bez Math.random na serveri
  const audienceCount = 241;

  const handleActivate = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('syncing');
    setProgress(0);

    if (typeof window !== "undefined" && typeof (window as { gtag?: unknown }).gtag === "function") {
      (window as { gtag: (...args: unknown[]) => void }).gtag("event", "digital_twin_activated", {
        source: "demo_page",
      });
    }

    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15 + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setPhase('done'), 300);
      }
      setProgress(Math.min(100, current));
    }, 200);
  }, [phase]);

  return (
    <div
      className="rounded-3xl p-8"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <Users className="mb-6" size={36} style={{ color: "#A855F7" }} />
      <h2 className="text-2xl font-bold text-white mb-2">3. Digital Twin Ads</h2>
      <p className="text-sm mb-6" style={{ color: "#64748B" }}>
        AI nájde na Facebooku digitálne dvojičky vašich úspešných predajcov
        a zacieli na nich s presnosťou 94&nbsp;%.
      </p>

      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(to bottom, rgba(168,85,247,0.08), transparent)",
          border: "1px solid rgba(168,85,247,0.15)",
        }}
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
              {phase === 'idle'    && "Čaká na aktiváciu"}
              {phase === 'syncing' && "Syncing s Meta Ads API..."}
              {phase === 'done'    && "Lookalike Audience pripravená"}
            </span>
            {phase !== 'idle' && (
              <span className="text-[10px] font-bold" style={{ color: "#A855F7" }}>
                {Math.round(progress)}%
              </span>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden"
               style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: phase === 'done'
                  ? "linear-gradient(90deg, #A855F7, #34D399)"
                  : "linear-gradient(90deg, #7C3AED, #A855F7)",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleActivate}
          disabled={phase === 'syncing'}
          className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            border: "1px solid rgba(168,85,247,0.40)",
            color: phase === 'done' ? "#34D399" : "#A855F7",
            background: phase === 'done'
              ? "rgba(52,211,153,0.08)"
              : phase === 'syncing'
              ? "rgba(168,85,247,0.05)"
              : "rgba(168,85,247,0.08)",
            cursor: phase === 'syncing' ? "not-allowed" : "pointer",
          }}
        >
          {phase === 'idle'    && "Aktivovať AI Targeting"}
          {phase === 'syncing' && "Synchronizujem..."}
          {phase === 'done'    && "✓ Audience Aktívna"}
        </button>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["A","B","C","D","E"].map((letter) => (
              <div
                key={letter}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                style={{ background: "#1E1B2E", borderColor: "#0C0C14", color: "#94A3B8" }}
              >
                {letter}
              </div>
            ))}
            <div
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
              style={{ background: "#7C3AED", borderColor: "#0C0C14", color: "#fff" }}
            >
              +{audienceCount}
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "#475569" }}>
            potenciálnych predajcov identifikovaných
          </p>
        </div>

        {phase === 'done' && (
          <div className="mt-4 rounded-xl p-3"
               style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <p className="text-[11px]" style={{ color: "#34D399" }}>
              ✓ Lookalike audience synchronizovaná. Kampaň môže začať.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hlavný komponent ──────────────────────────────────────────────────────
export default function AcquisitionHub() {
  return (
    <div className="min-h-screen p-4 md:p-12" style={{ background: "#050509", color: "#F0F9FF" }}>
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: "#3B82F6" }}>
            Revolis.AI · Live Demo
          </p>
          <h1
            className="text-4xl md:text-6xl font-black mb-4"
            style={{
              background: "linear-gradient(135deg, #60A5FA, #22D3EE)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "var(--font-syne, sans-serif)",
            }}
          >
            AI ASISTENT:<br />AKVIZIČNÝ HUB
          </h1>
          <p className="text-lg" style={{ color: "#475569" }}>
            Exkluzívna ukážka AI modulov pre vašu realitnú kanceláriu
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <AiOdhadca />
          <NeighborhoodWatch />
          <DigitalTwin />
        </div>

        <div
          className="mt-16 text-center p-10 rounded-[32px]"
          style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <Shield className="mx-auto mb-4" size={28} style={{ color: "rgba(59,130,246,0.50)" }} />
          <h3 className="text-2xl font-bold text-white mb-3">Dôkaz atribúcie: Revolis Bridge</h3>
          <p className="text-sm max-w-2xl mx-auto mb-8" style={{ color: "#475569" }}>
            Všetky kontakty vygenerované týmito modulmi sa okamžite objavia
            vo vašom dashboarde so značkou{" "}
            <span
              className="font-bold text-xs px-2 py-0.5 rounded"
              style={{ color: "#60A5FA", background: "rgba(59,130,246,0.10)" }}
            >
              GENEROVANÉ AI ASISTENTOM
            </span>
            . Plná atribúcia, žiadne hádanie.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105"
            style={{ background: "#fff", color: "#050914" }}
          >
            POŽIADAŤ O AKTIVÁCIU MODULOV
            <ArrowRight size={16} />
          </a>
        </div>

      </div>
    </div>
  );
}
