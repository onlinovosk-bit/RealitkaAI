"use client";

import { useState } from "react";
import type { ListingContent, ListingPersona, PropertyInput } from "@/lib/ai/listing-content";
import {
  LISTING_VARIANTS,
  LISTING_VARIANT_KEYS,
  type ListingVariantKey,
  type ListingVariants,
} from "@/lib/ai/listing-variants";

const PERSONAS: { value: ListingPersona; label: string; hint: string }[] = [
  { value: "GENERAL", label: "Všeobecný kupujúci", hint: "Vyvážený text, hlavné silné stránky" },
  { value: "FAMILY", label: "Rodina s deťmi", hint: "Bezpečnosť, školy, priestor, tiché okolie" },
  { value: "INVESTOR", label: "Investor", hint: "Výnos z prenájmu, lokalita, potenciál rastu" },
  { value: "DOWNSIZER", label: "Zmenšujúci bývanie (50+)", hint: "Nízka údržba, výťah, dostupnosť" },
];

type Channel = { key: keyof ListingContent; label: string; emoji: string; multiline: boolean };

const CHANNELS: Channel[] = [
  { key: "portal_text", label: "Text na portál", emoji: "🏠", multiline: true },
  { key: "fb_ad_copy", label: "Facebook", emoji: "📘", multiline: true },
  { key: "ig_caption", label: "Instagram", emoji: "📸", multiline: true },
  { key: "email_subject", label: "Predmet e-mailu", emoji: "✉️", multiline: false },
  { key: "email_body", label: "Telo e-mailu", emoji: "📝", multiline: true },
];

const EMPTY: PropertyInput = {
  type: "",
  location: "",
  size_m2: 0,
  price: 0,
  condition: "po rekonštrukcii",
  features: [],
};

export default function ListingGeneratorClient() {
  const [property, setProperty] = useState<PropertyInput>(EMPTY);
  const [featuresRaw, setFeaturesRaw] = useState("");
  const [persona, setPersona] = useState<ListingPersona>("GENERAL");

  const [content, setContent] = useState<ListingContent | null>(null);
  const [variants, setVariants] = useState<ListingVariants | null>(null);
  /** Z ktorého variantu pochádza ktoré pole — to je ten moat signál. */
  const [chosen, setChosen] = useState<Partial<Record<keyof ListingContent, ListingVariantKey>>>({});
  /** Polia, ktoré maklér ručne prepísal — nesmú sa prepnutím variantu stratiť bez varovania. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const canGenerate =
    property.type.trim().length > 1 &&
    property.location.trim().length > 1 &&
    property.size_m2 > 0 &&
    property.price > 0 &&
    !loading;

  function set<K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) {
    setProperty((p) => ({ ...p, [k]: v }));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch("/api/ai/listing-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: {
            ...property,
            features: featuresRaw
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean),
          },
          persona,
          variants: true,
        }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setError(data.error ?? "Nedostatok kreditov.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Generovanie zlyhalo. Skúste znova.");
        return;
      }
      const vs = (data.variants ?? null) as ListingVariants | null;
      setVariants(vs);
      setContent(data.content as ListingContent);
      setGenerationId(data.generationId ?? null);
      // Východisko: všetko z konverzného variantu, maklér prepína po poliach.
      setChosen(
        vs
          ? (Object.fromEntries(
              CHANNELS.map((c) => [c.key, "conversion" as ListingVariantKey]),
            ) as Partial<Record<keyof ListingContent, ListingVariantKey>>)
          : {},
      );
      setTouched(new Set());
      setDirty(false);
    } catch {
      setError("Nepodarilo sa spojiť so serverom.");
    } finally {
      setLoading(false);
    }
  }

  function editField(key: keyof ListingContent, value: string) {
    setContent((c) => (c ? { ...c, [key]: value } : c));
    setTouched((t) => new Set(t).add(String(key)));
    setDirty(true);
    setSavedAt(null);
  }

  /**
   * Prepnutie variantu pre JEDNO pole — takto sa varianty miešajú.
   * Maklér môže mať portál z „Príbehu", Facebook z „Konverzného"
   * a e-mail z „Faktov". Výber sa zapisuje do chosen a ukladá cez PATCH.
   */
  function pickVariant(key: keyof ListingContent, variant: ListingVariantKey) {
    if (!variants) return;
    if (touched.has(String(key))) {
      const ok = window.confirm(
        "Toto pole si ručne upravil. Prepnutím variantu sa úprava prepíše. Pokračovať?",
      );
      if (!ok) return;
    }
    const next = variants[variant]?.[key];
    if (next === undefined) return;
    setContent((c) => (c ? { ...c, [key]: next } : c));
    setChosen((ch) => ({ ...ch, [key]: variant }));
    setTouched((t) => {
      const n = new Set(t);
      n.delete(String(key));
      return n;
    });
    setDirty(true);
    setSavedAt(null);
  }

  async function saveEdits() {
    if (!content || !generationId) return;
    setError(null);
    const res = await fetch(`/api/ai/listing-content/generations/${generationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editedOutput: content, chosenVariants: chosen, status: "edited" }),
    });
    if (res.ok) {
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("sk-SK"));
    } else {
      setError("Úpravu sa nepodarilo uložiť.");
    }
  }

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white " +
    "placeholder:text-slate-500 focus:border-violet-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-slate-400";

  return (
    <div className="space-y-6">
      {/* ---------- FORMULÁR ---------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Nehnuteľnosť
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="lg-type">Typ nehnuteľnosti *</label>
            <input id="lg-type" className={inputCls} placeholder="3-izbový byt"
              value={property.type} onChange={(e) => set("type", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-location">Lokalita *</label>
            <input id="lg-location" className={inputCls} placeholder="Prešov"
              value={property.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-district">Časť / štvrť</label>
            <input id="lg-district" className={inputCls} placeholder="Sídlisko III"
              value={property.district ?? ""} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-rooms">Dispozícia</label>
            <input id="lg-rooms" className={inputCls} placeholder="3+1"
              value={property.rooms ?? ""} onChange={(e) => set("rooms", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-size">Výmera (m²) *</label>
            <input id="lg-size" type="number" min={1} className={inputCls}
              value={property.size_m2 || ""} onChange={(e) => set("size_m2", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-price">Cena (€) *</label>
            <input id="lg-price" type="number" min={1} className={inputCls}
              value={property.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-floor">Poschodie</label>
            <input id="lg-floor" type="number" className={inputCls}
              value={property.floor ?? ""} onChange={(e) => set("floor", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lg-condition">Stav</label>
            <select id="lg-condition" className={inputCls} value={property.condition}
              onChange={(e) => set("condition", e.target.value)}>
              <option value="novostavba">novostavba</option>
              <option value="po rekonštrukcii">po rekonštrukcii</option>
              <option value="pôvodný stav">pôvodný stav</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="lg-features">Vybavenie (oddeľ čiarkou)</label>
            <input id="lg-features" className={inputCls} placeholder="balkón, parkovanie, pivnica"
              value={featuresRaw} onChange={(e) => setFeaturesRaw(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="lg-notes">Poznámky makléra</label>
            <textarea id="lg-notes" rows={3} className={inputCls}
              placeholder="Čo si všimol pri obhliadke — čo sa nedá vyčítať z parametrov."
              value={property.agent_notes ?? ""} onChange={(e) => set("agent_notes", e.target.value)} />
          </div>
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Pre koho píšeme
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <button key={p.value} type="button" onClick={() => setPersona(p.value)}
              className={`rounded-lg border p-3 text-left transition ${
                persona === p.value
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}>
              <div className="text-sm font-medium text-white">{p.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{p.hint}</div>
            </button>
          ))}
        </div>

        <button type="button" onClick={generate} disabled={!canGenerate}
          className="mt-5 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white
                     transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? "Generujem…" : "Vygenerovať texty"}
        </button>

        {error && (
          <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {/* ---------- VÝSTUP ---------- */}
      {content && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Vygenerované texty
              </h2>
              {variants && (
                <p className="mt-1 text-xs text-slate-500">
                  Ku každému kanálu máš štyri štýly. Vyber si pri každom zvlášť —
                  portál môže byť z „Príbehu miesta", Facebook z „Konverzného".
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {savedAt && <span className="text-xs text-emerald-400">Uložené o {savedAt}</span>}
              {dirty && generationId && (
                <button type="button" onClick={saveEdits}
                  className="rounded-lg border border-violet-600 px-3 py-1.5 text-xs font-medium
                             text-violet-300 transition hover:bg-violet-600/10">
                  Uložiť úpravy
                </button>
              )}
            </div>
          </div>

          {CHANNELS.map((ch) => {
            const value = String(content[ch.key] ?? "");
            return (
              <article key={ch.key} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <header className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {ch.emoji} {ch.label}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{value.length} znakov</span>
                    <button type="button" onClick={() => copy(ch.key, value)}
                      className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500">
                      {copied === ch.key ? "Skopírované" : "Kopírovať"}
                    </button>
                  </div>
                </header>
                {variants && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {LISTING_VARIANT_KEYS.map((vk) => {
                      const meta = LISTING_VARIANTS[vk];
                      const active = chosen[ch.key] === vk;
                      return (
                        <button
                          key={vk}
                          type="button"
                          title={`${meta.hint} — ${meta.bestFor}`}
                          onClick={() => pickVariant(ch.key, vk)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition ${
                            active
                              ? "border-violet-500 bg-violet-500/15 text-violet-200"
                              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                          }`}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                    {touched.has(String(ch.key)) && (
                      <span className="self-center pl-1 text-xs text-amber-400">upravené ručne</span>
                    )}
                  </div>
                )}

                {ch.multiline ? (
                  <textarea rows={ch.key === "portal_text" ? 10 : 5} value={value}
                    onChange={(e) => editField(ch.key, e.target.value)}
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2
                               text-sm leading-relaxed text-slate-100 focus:border-violet-500 focus:outline-none" />
                ) : (
                  <input value={value} onChange={(e) => editField(ch.key, e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2
                               text-sm text-slate-100 focus:border-violet-500 focus:outline-none" />
                )}
              </article>
            );
          })}

          <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <header className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-white">🔍 SEO kľúčové slová</span>
              <button type="button"
                onClick={() => copy("seo", (content.seo_keywords ?? []).join(", "))}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500">
                {copied === "seo" ? "Skopírované" : "Kopírovať"}
              </button>
            </header>
            <div className="flex flex-wrap gap-2">
              {(content.seo_keywords ?? []).map((k) => (
                <span key={k} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
                  {k}
                </span>
              ))}
            </div>
          </article>

          {!generationId && (
            <p className="text-xs text-amber-400">
              Draft sa nepodarilo uložiť — texty si skopíruj, po zavretí stránky budú preč.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
