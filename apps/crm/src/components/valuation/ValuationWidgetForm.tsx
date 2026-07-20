"use client";

import { useState } from "react";
import Link from "next/link";
import type { ValuationPageContext } from "@/lib/valuation/tenant";
import type {
  ValuationCondition,
  ValuationEstimateResult,
  ValuationPropertyType,
} from "@/lib/valuation/types";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  tenant: ValuationPageContext;
};

type PropertyForm = {
  propertyType: ValuationPropertyType;
  location: string;
  sqm: string;
  rooms: string;
  condition: ValuationCondition | "";
  floor: string;
  hasElevator: boolean;
  hasBalcony: boolean;
};

type ContactForm = {
  name: string;
  phone: string;
  email: string;
  sellWithin12Months: boolean;
  privacyAck: boolean;
  marketingOptIn: boolean;
};

const INITIAL_PROPERTY: PropertyForm = {
  propertyType: "byt",
  location: "",
  sqm: "",
  rooms: "",
  condition: "",
  floor: "",
  hasElevator: false,
  hasBalcony: false,
};

const INITIAL_CONTACT: ContactForm = {
  name: "",
  phone: "",
  email: "",
  sellWithin12Months: false,
  privacyAck: false,
  marketingOptIn: false,
};

export function ValuationWidgetForm({ tenant }: Props) {
  const [step, setStep] = useState<"property" | "result" | "contact" | "done">("property");
  const [property, setProperty] = useState<PropertyForm>(INITIAL_PROPERTY);
  const [contact, setContact] = useState<ContactForm>(INITIAL_CONTACT);
  const [estimate, setEstimate] = useState<ValuationEstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hp, setHp] = useState("");

  const brand = tenant.primaryColor || SLATE_HORIZON.brand;

  function updateProperty<K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) {
    setProperty((prev) => ({ ...prev, [key]: value }));
  }

  function updateContact<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEstimate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/valuation/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyType: property.propertyType,
          location: property.location,
          sqm: Number(property.sqm),
          rooms: property.rooms ? Number(property.rooms) : undefined,
          condition: property.condition || undefined,
          floor: property.floor ? Number(property.floor) : undefined,
          hasElevator: property.hasElevator,
          hasBalcony: property.hasBalcony,
          hp,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        estimate?: ValuationEstimateResult;
      };
      if (!res.ok || !data.ok || !data.estimate) {
        setError(data.error ?? "Nepodarilo sa vypočítať odhad.");
        return;
      }
      setEstimate(data.estimate);
      setStep("result");
    } catch {
      setError("Nepodarilo sa vypočítať odhad.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contact.privacyAck) {
      setError("Pred odoslaním potvrďte informácie o ochrane údajov.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/valuation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencySlug: tenant.slug,
          propertyType: property.propertyType,
          location: property.location,
          sqm: Number(property.sqm),
          rooms: property.rooms ? Number(property.rooms) : undefined,
          condition: property.condition || undefined,
          floor: property.floor ? Number(property.floor) : undefined,
          hasElevator: property.hasElevator,
          hasBalcony: property.hasBalcony,
          name: contact.name,
          email: contact.email,
          phone: contact.phone || undefined,
          sellWithin12Months: contact.sellWithin12Months,
          privacyAck: true,
          marketingOptIn: contact.marketingOptIn,
          estimate,
          hp,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Nepodarilo sa odoslať.");
        return;
      }
      setStep("done");
    } catch {
      setError("Nepodarilo sa odoslať.");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    background: WORKDESK_CARD.background,
    border: `1px solid ${WORKDESK_CARD.borderColor}`,
    boxShadow: WORKDESK_CARD.boxShadow,
  };

  const inputStyle = {
    background: SLATE_HORIZON.cardBg,
    border: `1px solid ${SLATE_HORIZON.softBorder}`,
    color: SLATE_HORIZON.ink,
  };

  if (step === "done") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl p-8 text-center" style={cardStyle}>
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: brand }}>
          Ďakujeme
        </p>
        <h2 className="mt-3 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Váš dopyt sme prijali
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          Maklér z {tenant.brandName} vás bude kontaktovať. {tenant.contactPromise}
        </p>
        {tenant.calendlyUrl && (
          <a
            href={tenant.calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-xl px-5 py-3 text-sm font-semibold text-white"
            style={{ background: brand }}
          >
            Rezervovať konzultáciu
          </a>
        )}
      </div>
    );
  }

  if (step === "result" && estimate) {
    return (
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>
            Orientačný odhad
          </p>
          {estimate.noEstimate ? (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
              {estimate.commentary}
            </p>
          ) : (
            <>
              <p className="mt-3 text-3xl font-black" style={{ color: SLATE_HORIZON.ink }}>
                €{estimate.low?.toLocaleString("sk-SK")} – €{estimate.high?.toLocaleString("sk-SK")}
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                {estimate.commentary}
              </p>
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
            {estimate.disclaimer}
            {estimate.sourceQuarter ? ` · Zdroj: NBS ${estimate.sourceQuarter}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStep("contact")}
          className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white"
          style={{ background: brand }}
        >
          Pokračovať — nechajte kontakt
        </button>
        <button
          type="button"
          onClick={() => setStep("property")}
          className="w-full text-sm underline"
          style={{ color: SLATE_HORIZON.muted }}
        >
          Upraviť údaje nehnuteľnosti
        </button>
      </div>
    );
  }

  if (step === "contact") {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
        <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Kam vám má maklér poslať detailnejší odhad?
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Meno a priezvisko
          </label>
          <input type="text" value={contact.name} onChange={(e) => updateContact("name", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required maxLength={200} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            E-mail
          </label>
          <input type="email" value={contact.email} onChange={(e) => updateContact("email", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required maxLength={254} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
            Telefón (nepovinné)
          </label>
          <input type="tel" value={contact.phone} onChange={(e) => updateContact("phone", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} maxLength={50} />
        </div>

        <label className="flex items-start gap-3 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          <input type="checkbox" checked={contact.sellWithin12Months} onChange={(e) => updateContact("sellWithin12Months", e.target.checked)} className="mt-1" />
          <span>Zvažujem predaj do 12 mesiacov</span>
        </label>

        <label className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          <input type="checkbox" checked={contact.privacyAck} onChange={(e) => updateContact("privacyAck", e.target.checked)} className="mt-1" required />
          <span>
            Beriem na vedomie{" "}
            <Link href={tenant.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: brand }}>
              informácie o ochrane osobných údajov
            </Link>{" "}
            ({tenant.brandName}).
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          <input type="checkbox" checked={contact.marketingOptIn} onChange={(e) => updateContact("marketingOptIn", e.target.checked)} className="mt-1" />
          <span>Chcem dostávať novinky (nepovinné).</span>
        </label>

        {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}>{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60" style={{ background: brand }}>
          {loading ? "Odosielam…" : "Odoslať dopyt"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleEstimate} className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
      <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Typ nehnuteľnosti</label>
        <select value={property.propertyType} onChange={(e) => updateProperty("propertyType", e.target.value as ValuationPropertyType)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required>
          <option value="byt">Byt</option>
          <option value="dom">Rodinný dom</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Mesto / lokalita</label>
        <input type="text" value={property.location} onChange={(e) => updateProperty("location", e.target.value)} placeholder="napr. Prešov, Sekčov" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required minLength={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Výmera (m²)</label>
          <input type="number" value={property.sqm} onChange={(e) => updateProperty("sqm", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required min={1} max={10000} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Počet izieb</label>
          <input type="number" value={property.rooms} onChange={(e) => updateProperty("rooms", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={1} max={20} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Stav</label>
        <select value={property.condition} onChange={(e) => updateProperty("condition", e.target.value as ValuationCondition | "")} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
          <option value="">Neuvedené</option>
          <option value="povodny">Pôvodný stav</option>
          <option value="ciastocna">Čiastočná rekonštrukcia</option>
          <option value="kompletna">Kompletná rekonštrukcia</option>
          <option value="novostavba">Novostavba</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Poschodie</label>
          <input type="number" value={property.floor} onChange={(e) => updateProperty("floor", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={-2} max={60} />
        </div>
        <div className="flex flex-col justify-end gap-3 pb-1 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          <label className="flex items-center gap-2"><input type="checkbox" checked={property.hasElevator} onChange={(e) => updateProperty("hasElevator", e.target.checked)} /> Výťah</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={property.hasBalcony} onChange={(e) => updateProperty("hasBalcony", e.target.checked)} /> Balkón / loggia</label>
        </div>
      </div>

      {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}>{error}</p>}

      <button type="submit" disabled={loading} className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60" style={{ background: brand }}>
        {loading ? "Počítam odhad…" : "Zobraziť orientačný odhad"}
      </button>
    </form>
  );
}
