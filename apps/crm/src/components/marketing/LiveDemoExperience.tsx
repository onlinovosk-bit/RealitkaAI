"use client";

import { useState } from "react";
import UnifiedDemo from "@/components/marketing/UnifiedDemo";

type RequestState = "idle" | "loading" | "success" | "error";

export default function LiveDemoExperience({
  agency,
  rep,
  prefill,
}: {
  agency: string;
  rep: string;
  prefill?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    agents?: string;
  };
}) {

  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [company, setCompany] = useState(agency === "Vašu kanceláriu" ? "" : agency);
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [city, setCity] = useState(prefill?.city ?? "");
  const agentsCount = Number(prefill?.agents ?? 3) || 3;
  const [note, setNote] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function submitDemoRequest() {
    if (!name.trim() || !email.trim() || !company.trim()) {
      setState("error");
      setError("Vyplňte meno, email a spoločnosť.");
      return;
    }

    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/demo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          city: city.trim(),
          agentsCount,
          note: note.trim(),
          source: "Live Demo Link",
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Nepodarilo sa odoslať žiadosť.");
      }

      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Nepodarilo sa odoslať žiadosť.");
    }
  }

  async function copyDemoLink() {
    const params = new URLSearchParams();
    if (agency && agency !== "Vašu kanceláriu") params.set("agency", agency);
    if (rep && rep !== "tím") params.set("rep", rep);
    if (name.trim()) params.set("name", name.trim());
    if (email.trim()) params.set("email", email.trim());
    if (phone.trim()) params.set("phone", phone.trim());
    if (city.trim()) params.set("city", city.trim());

    const query = params.toString();
    const base = typeof window !== "undefined" ? window.location.origin : "https://app.revolis.ai";
    const link = `${base}/demo/live${query ? `?${query}` : ""}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-[#010103] text-slate-100">
      <section className="border-b border-white/10 px-4 py-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Živé DEMO pre predaj</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
              Revolis.AI pre <span className="text-cyan-300">{agency}</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400 md:text-base">
              {rep}, realitná kancelária bez leadov nemá z čoho tvoriť provízie. Každý deň bez nových príležitostí
              znamená slabší cashflow o pár týždňov. Revolis to rieši priamo: generovanie leadov + AI asistent,
              ktorý mení záujem na uzatvorené obchody.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#031018]" href="#demo-core">
                1) Kliknúť DEMO
              </a>
              <a className="rounded-xl border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wider text-white" href="#demo-cta">
                2) Poslať žiadosť
              </a>
              <a className="rounded-xl border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wider text-white" href="/billing">
                3) Aktivovať prístup
              </a>
              <button
                type="button"
                onClick={copyDemoLink}
                className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-200"
              >
                {copied ? "Link skopírovaný" : "Kopírovať demo link"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">PAS DEMO script</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><strong>Problem:</strong> Máte nedostatok leadov, preto dnes neviete kde sú vaše peniaze.</li>
              <li><strong>Agitation:</strong> Bez leadov je pipeline prázdny a obchodný tím rieši stres namiesto provízií.</li>
              <li><strong>Solution:</strong> Revolis doručí leady a AI asistent povie najbližší krok ku každej príležitosti.</li>
            </ul>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <p className="font-bold text-cyan-200">Audit copy (3 slabšie línie + prepis)</p>
              <ul className="mt-2 space-y-1 text-slate-300">
                <li>„Bez leadov dnes nevznikne provízia zajtra."</li>
                <li>„Prázdny pipeline znamená slabší cashflow už o 30 dní."</li>
                <li>„AI asistent doručí konkrétny next step ku každému horúcemu leadu."</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="demo-core" className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <UnifiedDemo />
      </section>

      <section id="demo-cta" className="border-t border-white/10 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#060914] p-6 md:p-8">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Požiadať o prezentáciu</h2>
          <p className="mt-2 text-sm text-slate-400">
            Vyplňte kontakt a tím Revolis sa s Vami spojí.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none" placeholder="Meno a priezvisko" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none" placeholder="Spoločnosť" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none" placeholder="Telefón" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input type="hidden" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <textarea
            className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none"
            rows={3}
            placeholder="Poznámka (voliteľné): napr. preferovaný čas callu"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {state === "error" && <p className="mt-3 text-sm text-rose-400">{error}</p>}
          {state === "success" && (
            <p className="mt-3 text-sm text-emerald-400">
              Ďakujeme. Žiadosť je odoslaná, ozveme sa vám s termínom úvodného hovoru.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitDemoRequest}
              disabled={state === "loading"}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#031018] disabled:opacity-60"
            >
              {state === "loading" ? "Odosielam..." : "Požiadať o zaškolenie"}
            </button>
            <a
              href="/billing"
              className="rounded-xl border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-wider text-white"
            >
              Aktivovať platený prístup
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

