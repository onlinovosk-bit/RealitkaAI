"use client";

import { useState } from "react";
import { Globe } from "lucide-react";

export default function DeveloperRequestKeyCard() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "error">("ok");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/developer/request-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          useCase,
          requestedTier: "enterprise",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessageType("error");
        setMessage(data.error ?? "Nepodarilo sa odoslať žiadosť.");
        return;
      }
      setCompanyName("");
      setContactName("");
      setContactEmail("");
      setUseCase("");
      setMessageType("ok");
      setMessage("Žiadosť odoslaná. Náš tím vás bude kontaktovať.");
    } catch {
      setMessageType("error");
      setMessage("Chyba siete, skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[2.5rem] border border-blue-500/20 bg-gradient-to-br from-blue-600/20 to-transparent p-8 shadow-2xl">
      <h3 className="mb-2 font-black italic text-white">ENTERPRISE TIER</h3>
      <p className="mb-4 text-[40px] font-black text-white">
        499 €<span className="text-xs text-blue-400">/mo</span>
      </p>
      <ul className="mb-6 space-y-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <li className="flex items-center gap-2 text-blue-400">
          <Globe size={12} /> Unlimited Global Feeds
        </li>
        <li className="flex items-center gap-2">
          <Globe size={12} /> 5ms Latency SLA
        </li>
        <li className="flex items-center gap-2">
          <Globe size={12} /> Custom ML Models
        </li>
      </ul>

      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company name"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contact name"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
        />
        <input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="Contact email"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
        />
        <textarea
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          placeholder="Use case"
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
        />
        <button
          disabled={submitting}
          className="w-full rounded-2xl bg-blue-600 py-4 text-xs font-black text-white transition-all hover:bg-blue-500 disabled:opacity-60"
        >
          {submitting ? "SENDING..." : "REQUEST API KEY"}
        </button>
      </form>
      {message ? (
        <p className={`mt-3 text-xs ${messageType === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{message}</p>
      ) : null}
    </div>
  );
}
