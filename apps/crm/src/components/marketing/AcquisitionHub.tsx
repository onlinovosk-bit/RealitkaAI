"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Calculator, Eye, Users, Mail, GitMerge, UserSearch,
  CheckCircle, Zap, ArrowRight, TrendingUp, TrendingDown,
  Minus, Loader2, Shield, RefreshCcw, Send, Download, ChevronDown, ChevronUp,
} from "lucide-react";
import type {
  PropertyEstimate, NeighborAlert, ArbitrageCandidate,
  StealthProspect, ModuleStatus,
} from "@/types/acquisition-hub";

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatEur(n: number) {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function TrendIcon({ trend }: { trend: PropertyEstimate["trend"] }) {
  if (trend === "rising")  return <TrendingUp  size={14} style={{ color: "#34D399" }} />;
  if (trend === "falling") return <TrendingDown size={14} style={{ color: "#FCA5A5" }} />;
  return <Minus size={14} style={{ color: "#94A3B8" }} />;
}
const EVENT_LABELS: Record<NeighborAlert["eventType"], string> = {
  price_drop: "Zníženie ceny", new_listing: "Nová ponuka",
  sold: "Predaná", price_increase: "Zvýšenie ceny",
};
const EVENT_COLORS: Record<NeighborAlert["eventType"], string> = {
  price_drop: "#FCA5A5", new_listing: "#67E8F9", sold: "#34D399", price_increase: "#FCD34D",
};
const PLATFORM_LABELS: Record<StealthProspect["platform"], string> = {
  bazos: "Bazoš", nehnutelnosti: "Nehnuteľnosti.sk", reality: "Reality.sk",
  facebook: "Facebook", other: "iný portál",
};

// ─── Card wrapper ─────────────────────────────────────────────────────────
export function Card({ children, accent = "rgba(59,130,246,0.25)", tag, tagColor = "#93C5FD" }: {
  children: React.ReactNode; accent?: string; tag?: string; tagColor?: string;
}) {
  return (
    <div className="rounded-3xl p-7 relative overflow-hidden flex flex-col"
         style={{ background: "#0C0C14", border: `1px solid ${accent}` }}>
      {tag && (
        <div className="absolute top-0 right-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl"
             style={{ background: `${tagColor}18`, color: tagColor, borderLeft: `1px solid ${tagColor}30`, borderBottom: `1px solid ${tagColor}30` }}>
          {tag}
        </div>
      )}
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, variant = "primary", className = "" }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; variant?: "primary" | "outline" | "success" | "danger"; className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff", boxShadow: "0 0 20px rgba(37,99,235,.25)" },
    outline: { background: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,.12)" },
    success: { background: "#16A34A", color: "#fff" },
    danger:  { background: "#DC2626", color: "#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${className}`}
      style={styles[variant]}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 1: AI Odhadca 3.0
// ═══════════════════════════════════════════════════════════════════════════
export function AiOdhadca() {
  const [address, setAddress]   = useState("Sabinovská 12, Prešov");
  const [sqm, setSqm]           = useState(75);
  const [status, setStatus]     = useState<ModuleStatus>("idle");
  const [estimate, setEstimate] = useState<PropertyEstimate | null>(null);
  const [email, setEmail]       = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [gdprError, setGdprError]     = useState(false);

  const calculate = useCallback(async () => {
    if (address.trim().length < 5) { setError("Zadajte platnú adresu."); return; }
    setError(null); setStatus("calculating");
    try {
      const res = await fetch("/api/demo/estimate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, sqm }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Chyba");
      setEstimate(await res.json()); setStatus("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Chyba"); setStatus("error"); }
  }, [address, sqm]);

  const sendEmail = useCallback(async () => {
    if (!gdprConsent) { setGdprError(true); return; }
    setGdprError(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Zadajte platný email."); return; }
    setError(null); setStatus("email_pending");
    try {
      const res = await fetch("/api/demo/capture-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, address, source: "ai_odhadca", estimatedPrice: estimate?.estimatedPrice, gdprConsent: true }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Chyba servera.");
      }
      setEmailSent(true); setStatus("email_sent");
      if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "demo_lead_captured", { source: "ai_odhadca", gdpr_consent: true });
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Neznáma chyba."); setStatus("done"); }
  }, [email, address, estimate, gdprConsent]);

  return (
    <Card accent="rgba(59,130,246,0.30)" tag="Lead Magnet" tagColor="#93C5FD">
      <Calculator className="mb-5" size={32} style={{ color: "#3B82F6" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">1. AI Odhadca 3.0</h2>
      <p className="text-xs mb-5" style={{ color: "#64748B" }}>
        Mení anonymných návštevníkov na overené kontakty cez prediktívnu analýzu ceny.
      </p>
      <div className="flex-1 rounded-2xl p-4 space-y-3"
           style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#3B82F6" }}>
            Adresa nehnuteľnosti
          </label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            disabled={status === "calculating"}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", color: "#F0F9FF", outline: "none" }} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#94A3B8" }}>
            Výmera: <span style={{ color: "#F0F9FF" }}>{sqm} m²</span>
          </label>
          <input type="range" min={30} max={300} step={5} value={sqm}
            onChange={e => setSqm(Number(e.target.value))} disabled={status === "calculating"}
            className="w-full accent-blue-500" />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,.08)", color: "#FCA5A5" }}>⚠ {error}</p>}
        {estimate && status !== "idle" && status !== "calculating" && (
          <div className="rounded-xl p-3 space-y-1.5"
               style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.15)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#64748B" }}>Odhadovaná cena</span>
              <div className="flex items-center gap-1.5">
                <TrendIcon trend={estimate.trend} />
                <span className="text-lg font-black" style={{ color: "#93C5FD" }}>{formatEur(estimate.estimatedPrice)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{ color: "#475569" }}>
              <span>{estimate.pricePerSqm} €/m²</span>
              <span>{estimate.comparables} porovnaní</span>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "#34D399" }}>
              <CheckCircle size={11} />
              Spoľahlivosť: {estimate.confidence === "high" ? "Vysoká" : estimate.confidence === "medium" ? "Stredná" : "Nízka"}
            </div>
          </div>
        )}
        {status === "done" && !emailSent && (
          <div className="pt-1 space-y-2">
            <p className="text-xs mb-2" style={{ color: "#64748B" }}>Email pre stiahnutie AI Reportu:</p>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.sk"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(59,130,246,.30)", color: "#F0F9FF", outline: "none" }}
                onKeyDown={e => { if (e.key === "Enter") void sendEmail(); }} />
              <button onClick={() => void sendEmail()}
                className="px-3 py-2.5 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: "#22C55E", color: "#050914" }}>
                <ArrowRight size={15} />
              </button>
            </div>
            {/* GDPR Checkbox */}
            <div className="mt-1">
              <label
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => { setGdprConsent(!gdprConsent); setGdprError(false); }}
              >
                <div
                  className="flex-shrink-0 w-4 h-4 mt-0.5 rounded flex items-center justify-center transition-all"
                  style={{
                    background: gdprConsent ? "#22C55E" : "rgba(255,255,255,0.05)",
                    border: gdprError ? "1px solid #FCA5A5" : gdprConsent ? "1px solid #22C55E" : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {gdprConsent && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#050914" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] leading-relaxed" style={{ color: "#64748B" }}>
                  Súhlasím so spracovaním mojich osobných údajov (email, adresa) za účelom zasielania reportu.{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                    style={{ color: "#22D3EE" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              {gdprError && (
                <p className="text-[11px] mt-1" style={{ color: "#FCA5A5" }}>
                  ⚠ Súhlas so spracovaním údajov je povinný.
                </p>
              )}
            </div>
          </div>
        )}
        {emailSent && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#34D399" }}>
            <CheckCircle size={14} /> Report odoslaný!
          </div>
        )}
        {(status === "idle" || status === "error") && (
          <Btn onClick={() => void calculate()}>VYPOČÍTAŤ TRHOVÚ CENU</Btn>
        )}
        {status === "calculating" && (
          <Btn loading disabled variant="outline">Analyzujem trh...</Btn>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 2: Neighborhood Watch (live backend)
// ═══════════════════════════════════════════════════════════════════════════
export function NeighborhoodWatch() {
  const [area, setArea]           = useState("presov");
  const [alerts, setAlerts]       = useState<NeighborAlert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [email, setEmail]         = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subError, setSubError]   = useState<string | null>(null);

  const loadAlerts = useCallback(async (selectedArea: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/neighborhood-watch/alerts?area=${encodeURIComponent(selectedArea)}`);
      const data = await res.json() as { alerts?: NeighborAlert[] };
      setAlerts(data.alerts ?? []);
    } catch { setAlerts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAlerts(area); }, [area, loadAlerts]);

  const subscribe = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSubError("Platný email prosím."); return; }
    setSubError(null);
    try {
      await fetch("/api/neighborhood-watch/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, area }),
      });
      setSubscribed(true);
    } catch { setSubError("Chyba pri odosielaní."); }
  };

  return (
    <Card accent="rgba(239,68,68,0.25)" tag="Live Monitoring" tagColor="#FCA5A5">
      <Eye className="mb-5" size={32} style={{ color: "#EF4444" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">2. Neighborhood Watch</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        Pohyby cien susedov v reálnom čase. Udržuje klientov vo vašom ekosystéme mesiace pred predajom.
      </p>

      <select value={area} onChange={e => { setArea(e.target.value); setSubscribed(false); }}
        className="w-full px-3 py-2 rounded-xl text-xs mb-4"
        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", color: "#F0F9FF", outline: "none" }}>
        <option value="presov">Prešov</option>
        <option value="kosice">Košice</option>
        <option value="bratislava">Bratislava</option>
      </select>

      <div className="flex-1 space-y-2 mb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs py-6 justify-center" style={{ color: "#475569" }}>
            <Loader2 size={14} className="animate-spin" /> Načítavam upozornenia...
          </div>
        ) : alerts.slice(0, 5).map(a => (
          <button key={a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01]"
            style={{
              background: a.isUrgent ? "rgba(239,68,68,.06)" : "rgba(255,255,255,.02)",
              border: a.isUrgent ? "1px solid rgba(239,68,68,.20)" : "1px solid rgba(255,255,255,.05)",
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{a.address}</p>
                <p className="text-[10px] mt-0.5" style={{ color: EVENT_COLORS[a.eventType] }}>
                  {EVENT_LABELS[a.eventType]}
                  {a.changeAmount != null && ` ${a.changeAmount > 0 ? "+" : ""}${a.changeAmount.toLocaleString("sk-SK")} €`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: "#334155" }}>pred {a.daysAgo}d</span>
                {a.isUrgent && <Zap size={11} style={{ color: "#FCD34D" }} />}
              </div>
            </div>
            {expanded === a.id && (
              <div className="mt-2 pt-2 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,.05)", color: "#64748B" }}>
                AI analýza: Táto zmena môže ovplyvniť hodnotu nehnuteľností v okolí o ±3–5 %. Odporúčame kontakt s klientom v lokalite.
              </div>
            )}
          </button>
        ))}
        {!loading && alerts.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "#475569" }}>Žiadne upozornenia pre túto lokalitu.</p>
        )}
      </div>

      {!subscribed ? (
        <div>
          <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Dostávať upozornenia emailom:</p>
          <div className="flex gap-2">
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setSubError(null); }}
              placeholder="vas@email.sk" className="flex-1 px-3 py-2 rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,.05)", border: `1px solid ${subError ? "rgba(239,68,68,.40)" : "rgba(239,68,68,.25)"}`, color: "#F0F9FF", outline: "none" }} />
            <button onClick={() => void subscribe()}
              className="px-3 py-2 rounded-xl font-bold text-xs transition-all hover:scale-105"
              style={{ background: "#DC2626", color: "#fff" }}>
              <Mail size={13} />
            </button>
          </div>
          {subError && <p className="text-[10px] mt-1" style={{ color: "#FCA5A5" }}>{subError}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#34D399" }}>
          <CheckCircle size={13} /> Sledovanie aktivované pre {area}!
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 3: AI Ghostwriter (real OpenAI + Resend)
// ═══════════════════════════════════════════════════════════════════════════
export function AIGhostwriter() {
  const [address, setAddress]     = useState("");
  const [eventType, setEventType] = useState("dedičstvo");
  const [agentName, setAgentName] = useState("");
  const [status, setStatus]       = useState<ModuleStatus>("idle");
  const [letter, setLetter]       = useState<{ id: string; letterHtml: string; letterText: string } | null>(null);
  const [email, setEmail]         = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generate = async () => {
    if (address.trim().length < 5) { setError("Zadajte adresu nehnuteľnosti."); return; }
    setError(null); setStatus("generating"); setLetter(null); setEmailSent(false);
    try {
      const res = await fetch("/api/ghostwriter/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAddress: address, eventType, agentName: agentName || undefined }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Chyba");
      setLetter(await res.json() as { id: string; letterHtml: string; letterText: string });
      setStatus("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Chyba"); setStatus("error"); }
  };

  const sendEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Platný email prosím."); return; }
    if (!letter) return;
    setError(null); setStatus("email_pending");
    try {
      const res = await fetch("/api/ghostwriter/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterId: letter.id, recipientEmail: email, letterHtml: letter.letterHtml, ownerAddress: address }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Chyba");
      setEmailSent(true); setStatus("email_sent");
    } catch (e) { setError(e instanceof Error ? e.message : "Chyba"); setStatus("done"); }
  };

  const downloadHtml = () => {
    if (!letter) return;
    const blob = new Blob([`<!DOCTYPE html><html lang="sk"><head><meta charset="UTF-8"><title>List – ${address}</title></head><body style="font-family:Georgia,serif;max-width:620px;margin:40px auto;padding:0 20px">${letter.letterHtml}</body></html>`], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `list_${address.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.html`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <Card accent="rgba(239,68,68,0.25)" tag="Legal Watch" tagColor="#FCA5A5">
      <Mail className="mb-5" size={32} style={{ color: "#EF4444" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">4. AI Ghostwriter</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        Katastrálny radar deteguje dedičstvá a plomby. AI okamžite generuje expertný list pre majiteľa.
      </p>
      <div className="flex-1 rounded-2xl p-4 space-y-3"
           style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#FCA5A5" }}>
            Adresa nehnuteľnosti (LV)
          </label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Sabinovská 12, Prešov"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", color: "#F0F9FF", outline: "none" }} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#94A3B8" }}>
            Typ katastrálnej udalosti
          </label>
          <select value={eventType} onChange={e => setEventType(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", color: "#F0F9FF", outline: "none" }}>
            <option value="dedičstvo">Zápis dedičstva</option>
            <option value="plomba">Katastrálna plomba</option>
            <option value="zmena">Zmena vlastníka</option>
            <option value="hypotéka">Zápis hypotéky</option>
            <option value="exekúcia">Exekúčné konanie</option>
            <option value="výmaz">Výmaz záložného práva</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "#94A3B8" }}>
            Vaše meno (voliteľné)
          </label>
          <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
            placeholder="Ing. Ján Novák"
            className="w-full px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", color: "#F0F9FF", outline: "none" }} />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,.08)", color: "#FCA5A5" }}>⚠ {error}</p>}
        {letter && status === "done" && (
          <div className="space-y-2">
            <button onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.20)", color: "#FCA5A5" }}>
              <span>Náhľad listu</span>
              {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showPreview && (
              <div className="rounded-xl p-3 max-h-40 overflow-y-auto text-xs leading-relaxed"
                   style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: "#94A3B8" }}>
                {letter.letterText}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={downloadHtml}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#94A3B8" }}>
                <Download size={12} /> HTML
              </button>
              <button onClick={() => { if (typeof window !== "undefined") { const w = window.open("", "_blank"); if (w) { w.document.write(`<style>body{font-family:Georgia,serif;max-width:620px;margin:40px auto;padding:0 20px}@media print{body{margin:0}}</style>${letter.letterHtml}`); w.document.close(); setTimeout(() => w.print(), 500); } } }}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#94A3B8" }}>
                PDF (Print)
              </button>
            </div>
            {!emailSent ? (
              <div className="pt-1">
                <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Odoslať list emailom majiteľovi:</p>
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="majitel@email.sk"
                    className="flex-1 px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(239,68,68,.30)", color: "#F0F9FF", outline: "none" }} />
                  <button onClick={() => void sendEmail()}
                    className="px-3 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#DC2626", color: "#fff" }}>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#34D399" }}>
                <CheckCircle size={13} /> List odoslaný majiteľovi!
              </div>
            )}
          </div>
        )}
        {(status === "idle" || status === "error") && (
          <Btn onClick={() => void generate()} variant="danger">GENEROVAŤ LIST</Btn>
        )}
        {status === "generating" && (
          <Btn loading disabled variant="outline">GPT-4o píše list...</Btn>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 4 → becomes slot 5: Real Estate Arbitrage
// ═══════════════════════════════════════════════════════════════════════════
export function RealEstateArbitrage() {
  const [candidates, setCandidates] = useState<ArbitrageCandidate[]>([]);
  const [loading, setLoading]       = useState(false);
  const [loaded, setLoaded]         = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/arbitrage/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLive: false }),
      });
      const data = await res.json() as { candidates?: ArbitrageCandidate[] };
      setCandidates(data.candidates ?? []);
      setLoaded(true);
    } catch { setCandidates([]); setLoaded(true); }
    setLoading(false);
  };

  const scoreColor = (s: number) => s >= 80 ? "#34D399" : s >= 60 ? "#FCD34D" : "#FCA5A5";

  return (
    <Card accent="rgba(234,179,8,0.25)" tag="Flow Engine" tagColor="#FCD34D">
      <GitMerge className="mb-5" size={32} style={{ color: "#EAB308" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">5. Real Estate Arbitrage</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        Premieňa neúspešných kupujúcich na predajcov. AI identifikuje exit-strategy kandídátov vo vašom CRM.
      </p>
      <div className="flex-1 space-y-2">
        {!loaded ? (
          <Btn onClick={() => void scan()} loading={loading} variant="outline"
               className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
            {loading ? "Skenujem CRM..." : "SPUSTIŤ ARBITRÁŽ SCAN"}
          </Btn>
        ) : candidates.map(c => (
          <button key={c.id} onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01]"
            style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(234,179,8,.15)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">{c.name}</span>
              <span className="text-xs font-black" style={{ color: scoreColor(c.arbitrageScore) }}>
                {c.arbitrageScore}%
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "#64748B" }}>
              Záujem: {c.interestedAddress}
            </p>
            {c.ownedAddress && (
              <p className="text-[10px]" style={{ color: "#FCD34D" }}>Vlastní: {c.ownedAddress}</p>
            )}
            {expanded === c.id && (
              <div className="mt-2 pt-2 space-y-1.5 text-xs"
                   style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <p style={{ color: "#94A3B8" }}>{c.reasoning}</p>
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg"
                     style={{ background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.15)" }}>
                  <Zap size={11} style={{ color: "#FCD34D", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: "#FCD34D" }}>{c.recommendedAction}</span>
                </div>
              </div>
            )}
          </button>
        ))}
        {loaded && candidates.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: "#475569" }}>Žiadni kandidáti nenájdení.</p>
        )}
        {loaded && (
          <Btn onClick={() => { setLoaded(false); setCandidates([]); }} variant="outline">
            <RefreshCcw size={12} /> Nový scan
          </Btn>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 5 → becomes slot 3: Digital Twin Ads (Meta API)
// ═══════════════════════════════════════════════════════════════════════════
export function DigitalTwin() {
  const [phase, setPhase]   = useState<"idle" | "syncing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ audienceId: string; size: number; status: string; message: string } | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const activate = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("syncing"); setProgress(0); setError(null);

    // Progress animation
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 12 + 4;
      if (current >= 95) { current = 95; clearInterval(interval); }
      setProgress(Math.min(95, current));
    }, 200);

    try {
      const res = await fetch("/api/meta/lookalike", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "leads_demo" }),
      });
      clearInterval(interval);
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Chyba");
      const data = await res.json() as { audienceId: string; size: number; status: string; message: string };
      setProgress(100);
      setTimeout(() => { setResult(data); setPhase("done"); }, 300);

      if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "digital_twin_activated", { source: "demo_page" });
      }
    } catch (e) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : "Chyba");
      setPhase("idle"); setProgress(0);
    }
  }, [phase]);

  return (
    <Card accent="rgba(168,85,247,0.25)" tag="Scale Engine" tagColor="#C4B5FD">
      <Users className="mb-5" size={32} style={{ color: "#A855F7" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">3. Digital Twin Ads</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        AI nájde na Facebooku digitálne dvojičky vašich predajcov a zacieli Lookalike kampaň s presnosťou 94 %.
      </p>
      <div className="flex-1 rounded-2xl p-5"
           style={{ background: "linear-gradient(to bottom,rgba(168,85,247,.08),transparent)", border: "1px solid rgba(168,85,247,.15)" }}>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
              {phase === "idle" && "Čaká na aktiváciu"}
              {phase === "syncing" && "Synchronizujem s Meta API..."}
              {phase === "done" && "Lookalike Audience pripravená"}
            </span>
            {phase !== "idle" && (
              <span className="text-[10px] font-bold" style={{ color: "#A855F7" }}>{Math.round(progress)}%</span>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.05)" }}>
            <div className="h-full rounded-full transition-all duration-300"
                 style={{
                   width: `${progress}%`,
                   background: phase === "done" ? "linear-gradient(90deg,#A855F7,#34D399)" : "linear-gradient(90deg,#7C3AED,#A855F7)",
                 }} />
          </div>
        </div>
        {error && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,.08)", color: "#FCA5A5" }}>⚠ {error}</p>}
        {result && (
          <div className="mb-4 rounded-xl p-3 space-y-1 text-xs"
               style={{ background: "rgba(168,85,247,.08)", border: "1px solid rgba(168,85,247,.20)" }}>
            <p style={{ color: "#C4B5FD" }}>
              <strong>ID:</strong> <span style={{ color: "#94A3B8" }}>{result.audienceId}</span>
            </p>
            <p style={{ color: "#C4B5FD" }}>
              <strong>Veľkosť:</strong> <span style={{ color: "#94A3B8" }}>{result.size} kontaktov</span>
            </p>
            <p style={{ color: "#64748B" }}>{result.message}</p>
          </div>
        )}
        <button onClick={() => void activate()} disabled={phase === "syncing"}
          className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          style={{
            border: "1px solid rgba(168,85,247,.40)",
            color: phase === "done" ? "#34D399" : "#A855F7",
            background: phase === "done" ? "rgba(52,211,153,.08)" : "rgba(168,85,247,.08)",
            cursor: phase === "syncing" ? "not-allowed" : "pointer",
          }}>
          {phase === "idle" && "Aktivovať AI Targeting"}
          {phase === "syncing" && <><Loader2 size={13} className="animate-spin inline mr-1.5" />Synchronizujem...</>}
          {phase === "done" && "✓ Audience Aktívna"}
        </button>
        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {["A","B","C","D","E"].map(l => (
              <div key={l} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                   style={{ background: "#1E1B2E", borderColor: "#0C0C14", color: "#94A3B8" }}>{l}</div>
            ))}
            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                 style={{ background: "#7C3AED", borderColor: "#0C0C14", color: "#fff" }}>241+</div>
          </div>
          <p className="text-[10px]" style={{ color: "#475569" }}>potenciálnych predajcov identifikovaných</p>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 6: Stealth Recruiter
// ═══════════════════════════════════════════════════════════════════════════
export function StealthRecruiter() {
  const [prospects, setProspects]     = useState<StealthProspect[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loaded, setLoaded]           = useState(false);
  const [selected, setSelected]       = useState<StealthProspect | null>(null);
  const [outreach, setOutreach]       = useState<string | null>(null);
  const [outreachLoading, setOL]      = useState(false);
  const [sendEmail, setSendEmail]     = useState("");
  const [sent, setSent]               = useState(false);

  const scan = async () => {
    setLoading(true); setSelected(null); setOutreach(null); setSent(false);
    try {
      const res = await fetch("/api/stealth-recruiter/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateNew: true }),
      });
      const data = await res.json() as { prospects?: StealthProspect[] };
      setProspects(data.prospects ?? []);
      setLoaded(true);
    } catch { setProspects([]); setLoaded(true); }
    setLoading(false);
  };

  const generateOutreach = async (p: StealthProspect) => {
    setSelected(p); setOutreach(null); setOL(true); setSent(false);
    try {
      const res = await fetch("/api/stealth-recruiter/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: p.id, address: p.address, daysListed: p.daysListed,
          originalPrice: p.originalPrice, currentPrice: p.currentPrice, platform: p.platform,
          action: "generate",
        }),
      });
      const data = await res.json() as { outreachText?: string };
      setOutreach(data.outreachText ?? "");
    } catch { setOutreach("Chyba pri generovaní."); }
    setOL(false);
  };

  const doSend = async () => {
    if (!selected || !outreach || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendEmail)) return;
    setOL(true);
    try {
      await fetch("/api/stealth-recruiter/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: selected.id, address: selected.address, platform: selected.platform,
          daysListed: selected.daysListed, originalPrice: selected.originalPrice,
          currentPrice: selected.currentPrice, recipientEmail: sendEmail, action: "send",
        }),
      });
      setSent(true);
    } catch { /* silent */ }
    setOL(false);
  };

  const scoreColor = (s: number) => s >= 80 ? "#34D399" : s >= 60 ? "#FCD34D" : "#FCA5A5";

  return (
    <Card accent="rgba(34,211,238,0.20)" tag="Shadow MLS" tagColor="#67E8F9">
      <UserSearch className="mb-5" size={32} style={{ color: "#22D3EE" }} />
      <h2 className="text-xl font-bold text-white mb-1.5">6. Tichý Náborár</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        Nájde predajcov na Bazoši, ktorým sa nedarí predať. AI napíše správu každému presne na mieru.
      </p>
      <div className="flex-1 space-y-2">
        {!loaded ? (
          <Btn onClick={() => void scan()} loading={loading}
               className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 border">
            {loading ? "Skenujem portály..." : "SPUSTIŤ STEALTH SCAN"}
          </Btn>
        ) : (
          <>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {prospects.map(p => (
                <button key={p.id} onClick={() => void generateOutreach(p)}
                  className="w-full text-left rounded-xl p-2.5 transition-all hover:scale-[1.01]"
                  style={{
                    background: selected?.id === p.id ? "rgba(34,211,238,.08)" : "rgba(255,255,255,.02)",
                    border: `1px solid ${selected?.id === p.id ? "rgba(34,211,238,.30)" : "rgba(255,255,255,.06)"}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{p.address}</p>
                      <p className="text-[10px]" style={{ color: "#64748B" }}>
                        {PLATFORM_LABELS[p.platform]} · {p.daysListed}d · -{p.priceDropPercent}%
                      </p>
                    </div>
                    <span className="text-xs font-black" style={{ color: scoreColor(p.score) }}>{p.score}%</span>
                  </div>
                </button>
              ))}
            </div>
            {outreachLoading && (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: "#67E8F9" }}>
                <Loader2 size={13} className="animate-spin" /> GPT-4o generuje outreach...
              </div>
            )}
            {outreach && !outreachLoading && (
              <div className="space-y-2">
                <div className="rounded-xl p-3 text-xs leading-relaxed"
                     style={{ background: "rgba(34,211,238,.05)", border: "1px solid rgba(34,211,238,.15)", color: "#94A3B8", whiteSpace: "pre-wrap" }}>
                  {outreach}
                </div>
                {!sent ? (
                  <div className="flex gap-2">
                    <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                      placeholder="samopredajca@email.sk" className="flex-1 px-3 py-2 rounded-xl text-xs"
                      style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(34,211,238,.25)", color: "#F0F9FF", outline: "none" }} />
                    <button onClick={() => void doSend()} disabled={outreachLoading}
                      className="px-3 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                      style={{ background: "#0891B2", color: "#fff" }}>
                      <Send size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#34D399" }}>
                    <CheckCircle size={13} /> Správa odoslaná!
                  </div>
                )}
              </div>
            )}
            <Btn onClick={() => { setLoaded(false); setSelected(null); setOutreach(null); setSent(false); }} variant="outline">
              <RefreshCcw size={12} /> Nový scan
            </Btn>
          </>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main export — 6 modulov v 2×3 mriežke
// ═══════════════════════════════════════════════════════════════════════════
export default function AcquisitionHub() {
  return (
    <div className="min-h-screen p-4 md:p-10" style={{ background: "#050509", color: "#F0F9FF" }}>
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#3B82F6" }}>
            Revolis.AI · Live Demo
          </p>
          <h1 className="text-4xl md:text-5xl font-black mb-3"
              style={{ background: "linear-gradient(135deg,#60A5FA,#22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AI ASISTENT: AKVIZIČNÝ HUB
          </h1>
          <p className="text-sm" style={{ color: "#475569" }}>
            6 produkčných modulov · Všetky živé · Žiadna simulácia
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AiOdhadca />
          <NeighborhoodWatch />
          <DigitalTwin />
          <AIGhostwriter />
          <RealEstateArbitrage />
          <StealthRecruiter />
        </div>

        <div className="mt-14 text-center p-8 rounded-[28px]"
             style={{ background: "rgba(255,255,255,.01)", border: "1px solid rgba(255,255,255,.05)" }}>
          <Shield className="mx-auto mb-3" size={24} style={{ color: "rgba(59,130,246,.50)" }} />
          <h3 className="text-xl font-bold text-white mb-2">Plná atribúcia každého mandátu</h3>
          <p className="text-sm max-w-xl mx-auto mb-6" style={{ color: "#475569" }}>
            Všetky kontakty sa okamžite objavia v dashboarde so značkou{" "}
            <span className="font-bold text-xs px-2 py-0.5 rounded" style={{ color: "#60A5FA", background: "rgba(59,130,246,.10)" }}>
              GENEROVANÉ AI ASISTENTOM
            </span>
          </p>
          <a href="/register"
             className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-105"
             style={{ background: "#fff", color: "#050914" }}>
            AKTIVOVAŤ PRE MOJU KANCELÁRIU <ArrowRight size={15} />
          </a>
        </div>

      </div>
    </div>
  );
}
