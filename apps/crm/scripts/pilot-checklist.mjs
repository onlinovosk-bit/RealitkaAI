#!/usr/bin/env node
/**
 * Pilot / CI: vypíše checklist premenných prostredia — len áno/nie, bez hodnôt tajomstiev.
 * Spustenie: npm run pilot:check
 * V CI nastav rovnaké premenné ako na Verceli (alebo spusti po deployi v prostredí s maskovanými secretmi).
 */

const env = process.env;

function present(name) {
  const v = env[name];
  return Boolean(v && String(v).trim());
}

const requiredRows = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase — URL projektu"],
];

const recommendedRows = [
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase — publishable key"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase — anon key"],
  ["NEXT_PUBLIC_APP_URL", "Verejná URL aplikácie (napr. https://app.revolis.ai)"],
  ["RESEND_API_KEY", "Resend — API kľúč (transakčné emaily)"],
  ["OUTREACH_FROM_EMAIL", "Resend — odosielateľ (FROM)"],
];

const optionalRows = [
  ["TWILIO_ACCOUNT_SID", "Twilio — Account SID (SMS z API)"],
  ["TWILIO_AUTH_TOKEN", "Twilio — auth token"],
  ["TWILIO_SMS_FROM", "Twilio — odosielacie číslo"],
  ["STRIPE_SECRET_KEY", "Stripe — fakturácia (ak pilotuješ s platbami)"],
];

function line(icon, key, label, isSet) {
  const state = isSet ? "nastavené" : "CHÝBA";
  console.log(`${icon}  ${label}`);
  console.log(`      ${key}: ${state}`);
}

console.log("");
console.log("Revolis.AI — pilot checklist (bez tajomstiev)\n");
console.log("Povinné pre beh CRM:\n");

let requiredFailed = false;
for (const [key, label] of requiredRows) {
  const ok = present(key);
  if (!ok) requiredFailed = true;
  line(ok ? "✓" : "✗", key, label, ok);
}

let recommendedMissing = 0;
console.log("\nOdporúčané pre prvého pilota (email z API, odkazy):\n");
for (const [key, label] of recommendedRows) {
  const ok = present(key);
  if (!ok) recommendedMissing += 1;
  line(ok ? "✓" : "○", key, label, ok);
}

console.log("\nVoliteľné:\n");
for (const [key, label] of optionalRows) {
  line(present(key) ? "·" : "·", key, label, present(key));
}

console.log("\n--- Manuálne (nereportuje env) ---\n");
const manual = [
  "Resend → Domains: doména z OUTREACH_FROM_EMAIL má stav Verified (alebo používaj onboarding@resend.dev na test).",
  "DNS: SPF/DKIM podľa Resend; DMARC aspoň p=none na začiatok.",
  "Vercel: rovnaké premenné ako lokálne .env.local v Production (a Preview ak treba).",
  "Jeden vlastník pilota z kancelárie + kanál na bugy (viď docs/PILOT-ONE-PAGER.md).",
  "Pilot Ferovo.sk: docs/pilot-ferovo-discovery-outline.md + docs/pilot-ferovo-onepager.md.",
];
manual.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

console.log("");
if (requiredFailed) {
  console.log("Výsledok: CHÝBA POVINNÁ PREMENNÁ → exit 1 (v CI doplň secrets / Vercel env).\n");
  process.exit(1);
}
if (recommendedMissing > 0) {
  console.log(
    `Výsledok: povinné OK. Odporúčané pre pilota: ešte ${recommendedMissing} položiek — exit 0 (pre prísny režim: STRICT_PILOT=1).\n`
  );
  if (process.env.STRICT_PILOT === "1") {
    process.exit(1);
  }
} else {
  console.log("Výsledok: povinné aj odporúčané pre pilota vyzerajú OK.\n");
}
process.exit(0);
