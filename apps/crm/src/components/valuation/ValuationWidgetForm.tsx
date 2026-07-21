"use client";

import { useState } from "react";
import Link from "next/link";
import type { ValuationPageContext } from "@/lib/valuation/tenant";
import type {
  ValuationCondition,
  ValuationEstimateResult,
  ValuationHeating,
  ValuationPropertyType,
} from "@/lib/valuation/types";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  tenant: ValuationPageContext;
};

type PropertyForm = {
  propertyType: ValuationPropertyType;
  city: string;
  postalCode: string;
  sqm: string;
  rooms: string;
  condition: ValuationCondition | "";
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasParking: boolean;
  landSqm: string;
  heating: ValuationHeating | "";
};

type ContactForm = {
  name: string;
  phone: string;
  email: string;
  sellTimeline: string;
  privacyAck: boolean;
  marketingOptIn: boolean;
};

const INITIAL_PROPERTY: PropertyForm = {
  propertyType: "byt",
  city: "",
  postalCode: "",
  sqm: "",
  rooms: "",
  condition: "",
  floor: "",
  totalFloors: "",
  yearBuilt: "",
  hasElevator: false,
  hasBalcony: false,
  hasParking: false,
  landSqm: "",
  heating: "",
};

const INITIAL_CONTACT: ContactForm = {
  name: "",
  phone: "",
  email: "",
  sellTimeline: "",
  privacyAck: false,
  marketingOptIn: false,
};

function buildLocation(city: string, postalCode: string): string {
  return [city.trim(), postalCode.trim()].filter(Boolean).join(", ");
}

function sellWithin12Months(timeline: string): boolean {
  return ["do 3 mesiacov", "do 6 mesiacov", "do 12 mesiacov"].includes(timeline);
}

export function ValuationWidgetForm({ tenant }: Props) {
  const [step, setStep] = useState<"contact" | "property" | "result">("contact");
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

  function handleContactContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contact.privacyAck) {
      setError("Pred pokračovaním potvrďte informácie o ochrane údajov.");
      return;
    }
    if (contact.phone.trim().length < 6) {
      setError("Zadajte platné telefónne číslo.");
      return;
    }
    setStep("property");
  }

  async function handlePropertySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const location = buildLocation(property.city, property.postalCode);
    try {
      const res = await fetch("/api/valuation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencySlug: tenant.slug,
          propertyType: property.propertyType,
          location,
          postalCode: property.postalCode || undefined,
          sqm: Number(property.sqm),
          rooms: property.rooms ? Number(property.rooms) : undefined,
          condition: property.condition || undefined,
          floor: property.floor ? Number(property.floor) : undefined,
          totalFloors: property.totalFloors ? Number(property.totalFloors) : undefined,
          yearBuilt: property.yearBuilt ? Number(property.yearBuilt) : undefined,
          hasElevator: property.hasElevator,
          hasBalcony: property.hasBalcony,
          hasParking: property.hasParking,
          landSqm: property.landSqm ? Number(property.landSqm) : undefined,
          heating: property.heating || undefined,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          sellTimeline: contact.sellTimeline || undefined,
          sellWithin12Months: sellWithin12Months(contact.sellTimeline),
          privacyAck: true,
          marketingOptIn: contact.marketingOptIn,
          hp,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        estimate?: ValuationEstimateResult;
      };
      if (!res.ok || !data.ok || !data.estimate) {
        setError(data.error ?? "Nepodarilo sa spracovať dopyt.");
        return;
      }
      setEstimate(data.estimate);
      setStep("result");
    } catch {
      setError("Nepodarilo sa spracovať dopyt.");
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

  if (step === "result" && estimate) {
    return (
      <div className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>
            Ďakujeme, {contact.name.split(" ")[0]}
          </p>
          <h2 className="mt-2 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
            Váš orientačný odhad
          </h2>
          {estimate.noEstimate ? (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
              {estimate.commentary}
            </p>
          ) : (
            <>
              <p className="mt-4 text-3xl font-black" style={{ color: SLATE_HORIZON.ink }}>
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
          <p className="mt-4 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
            Maklér z {tenant.brandName} vás bude kontaktovať na {contact.phone}
            {contact.email ? ` alebo ${contact.email}` : ""}. {tenant.contactPromise}
          </p>
        </div>
        {tenant.calendlyUrl && (
          <a
            href={tenant.calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white"
            style={{ background: brand }}
          >
            Rezervovať konzultáciu
          </a>
        )}
      </div>
    );
  }

  if (step === "property") {
    return (
      <form onSubmit={handlePropertySubmit} className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
        <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>
            Krok 2 z 2 · Nehnuteľnosť
          </p>
          <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Doplňte parametre — odhad uvidíte hneď po odoslaní.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Typ nehnuteľnosti</label>
          <select value={property.propertyType} onChange={(e) => updateProperty("propertyType", e.target.value as ValuationPropertyType)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required>
            <option value="byt">Byt</option>
            <option value="dom">Rodinný dom</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Mesto / časť</label>
            <input type="text" value={property.city} onChange={(e) => updateProperty("city", e.target.value)} placeholder="Prešov" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required minLength={2} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>PSČ</label>
            <input type="text" value={property.postalCode} onChange={(e) => updateProperty("postalCode", e.target.value)} placeholder="08001" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} maxLength={12} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Úžitková plocha (m²)</label>
            <input type="number" value={property.sqm} onChange={(e) => updateProperty("sqm", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required min={1} max={10000} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Počet izieb</label>
            <input type="number" value={property.rooms} onChange={(e) => updateProperty("rooms", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={1} max={20} />
          </div>
        </div>

        {property.propertyType === "dom" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Pozemok (m²)</label>
            <input type="number" value={property.landSqm} onChange={(e) => updateProperty("landSqm", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={1} max={100000} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Rok výstavby</label>
            <input type="number" value={property.yearBuilt} onChange={(e) => updateProperty("yearBuilt", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={1800} max={2035} placeholder="1990" />
          </div>
        </div>

        {property.propertyType === "byt" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Poschodie</label>
              <input type="number" value={property.floor} onChange={(e) => updateProperty("floor", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={-2} max={60} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Poschodí spolu</label>
              <input type="number" value={property.totalFloors} onChange={(e) => updateProperty("totalFloors", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} min={1} max={60} />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Kúrenie</label>
          <select value={property.heating} onChange={(e) => updateProperty("heating", e.target.value as ValuationHeating | "")} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
            <option value="">Neuvedené</option>
            <option value="plyn">Plyn</option>
            <option value="elektrina">Elektrina</option>
            <option value="distancne">Centrálne / diaľkové</option>
            <option value="tuhle">Tuhé palivo</option>
            <option value="ine">Iné</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          {property.propertyType === "byt" && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={property.hasElevator} onChange={(e) => updateProperty("hasElevator", e.target.checked)} /> Výťah</label>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={property.hasBalcony} onChange={(e) => updateProperty("hasBalcony", e.target.checked)} /> Balkón / loggia</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={property.hasParking} onChange={(e) => updateProperty("hasParking", e.target.checked)} /> Parkovanie</label>
        </div>

        {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}>{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60" style={{ background: brand }}>
          {loading ? "Počítam odhad…" : "Zobraziť môj odhad"}
        </button>
        <button type="button" onClick={() => setStep("contact")} className="w-full text-sm underline" style={{ color: SLATE_HORIZON.muted }}>
          Späť na kontakt
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleContactContinue} className="mx-auto max-w-lg space-y-5 rounded-3xl p-6 sm:p-8" style={cardStyle}>
      <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

      <div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: brand }}>
          Krok 1 z 2 · Kontakt
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          Najprv vás identifikujeme — orientačný odhad uvidíte až potom, spolu s kontaktom makléra.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Meno a priezvisko</label>
        <input type="text" value={contact.name} onChange={(e) => updateContact("name", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required maxLength={200} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Telefón</label>
          <input type="tel" value={contact.phone} onChange={(e) => updateContact("phone", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required minLength={6} maxLength={50} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>E-mail</label>
          <input type="email" value={contact.email} onChange={(e) => updateContact("email", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} required maxLength={254} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Kedy plánujete predávať?</label>
        <select value={contact.sellTimeline} onChange={(e) => updateContact("sellTimeline", e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
          <option value="">Neviem / zatiaľ nie</option>
          <option value="do 3 mesiacov">Do 3 mesiacov</option>
          <option value="do 6 mesiacov">Do 6 mesiacov</option>
          <option value="do 12 mesiacov">Do 12 mesiacov</option>
          <option value="neskôr">Neskôr ako za rok</option>
        </select>
      </div>

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

      <button type="submit" className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white" style={{ background: brand }}>
        Pokračovať na nehnuteľnosť
      </button>
    </form>
  );
}
