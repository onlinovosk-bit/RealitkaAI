/**
 * Founder Alert Adapter v0.1 — typy.
 *
 * Telegram NIE JE bus. Agent neposiela ľubovoľný text — vytvorí typovaný
 * AlertEvent, a až Router rozhodne, čo a kam sa doručí.
 *
 * Architektúra: docs/architecture/founder-alert-adapter-v0.1.md
 */

/** Poradie je významné: index = prahová hodnota pri porovnaní v policy. */
export const SEVERITIES = ["INFO", "EVENT", "WARNING", "CRITICAL", "GOVERNANCE"] as const;

export type Severity = (typeof SEVERITIES)[number];

export type AlertChannel = "slack" | "telegram";

export const SEVERITY_ICON: Record<Severity, string> = {
  INFO: "🟢",
  EVENT: "🔵",
  WARNING: "🟠",
  CRITICAL: "🔴",
  GOVERNANCE: "⚫",
};

/**
 * Pole `fields` je JEDINÝ voľný text, ktorý sa dostane k founderovi, a preto
 * podlieha pravidlu z CLAUDE.md §2/§4: identifikátory, nie obsah.
 *
 * Patrí sem: task_id, číslo PR, commit SHA, názov checku, stav brány.
 * NEPATRÍ sem: meno referenčného klienta, PII, riadky z DB, telá e-mailov.
 * Dôkaz sa odovzdáva cez `evidenceRef` (cesta alebo URL), nikdy vložením obsahu.
 */
export interface AlertEvent {
  /** Typ udalosti, napr. "CI_FAILURE", "GOVERNANCE_ALERT", "SECURITY". */
  type: string;
  severity: Severity;
  /** Jeden riadok, ktorý founder prečíta ako prvý. */
  title: string;
  /** Kto event vyrobil, napr. "executor", "night-watch", "revolis-guard". */
  agent: string;
  /**
   * Kľúč incidentu pre dedup. Rovnaký incident = rovnaký kľúč naprieč behmi,
   * aby monitor bežiaci každých 5 minút neposlal 12 správ za hodinu.
   */
  dedupKey: string;
  /** true = incident pominul; doručí sa aj v tichom intervale ako "vyriešené". */
  resolved?: boolean;
  /** Vyžaduje zásah foundera (merge, GO, prod). */
  actionRequired?: boolean;
  /** Krátke páry kľúč/hodnota — identifikátory, nie obsah. */
  fields?: Record<string, string>;
  /** Cesta v repe alebo URL, kde je dôkaz. Nikdy sem nepatrí telo dôkazu. */
  evidenceRef?: string;
  /** Voliteľné prepísanie času (testy). */
  at?: Date;
}

export interface DeliveryResult {
  channel: AlertChannel;
  delivered: boolean;
  /** Dôvod nedoručenia — nenakonfigurované, potlačené dedupom, chyba siete. */
  reason?: string;
}

export interface RouteResult {
  /** false = event bol potlačený policy alebo dedupom. */
  routed: boolean;
  suppressedBy?: "policy" | "dedup";
  deliveries: DeliveryResult[];
}
