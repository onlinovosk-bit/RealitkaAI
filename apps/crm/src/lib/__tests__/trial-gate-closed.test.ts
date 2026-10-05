// ================================================================
// Revolis.AI — po vypršaní trialu je účet read-only, nie otvorený
//
// `lib/saas-ops.ts` nieslo do produkcie toto:
//
//     // DEV OVERRIDE: Always allow full app access for development/testing
//     const canUseFullApp = true;
//
// `feature-gating.ts` je jediná brána prístupu, takže `requireActiveAppAccess()`
// nemohol nikdy vyhodiť výnimku. `getTrialGraceState()` pritom stav trialu aj
// grace obdobia POČÍTAL — a nikto ten výsledok nepoužil. Prechádza tou bránou
// 8 API ciest a 7 stránok (docs/reports/2026-10-05-fail-open-sweep.md, P1).
//
// Founder rozhodnutie 2026-10-05, variant A: po vypršaní klient svoje dáta
// ďalej číta a exportuje, ale nič nové nevytvorí.
//
// Každý test nižšie padne proti implementácii s natvrdo zapísaným `true`.
// ================================================================
import { describe, expect, it } from "vitest";

import { accessLevelFrom, type TrialGraceState } from "@/lib/saas-ops";
import { DEFAULT_TEAM_PERMISSIONS, UNKNOWN_TEAM_PERMISSIONS } from "@/types/navigation";

const WRITE: TrialGraceState["state"][] = ["trial", "active", "grace"];
const READ_ONLY: TrialGraceState["state"][] = ["limited", "blocked"];

describe("accessLevelFrom — zápisový prístup len v platných stavoch", () => {
  it.each(WRITE)("%s → plný prístup", (state) => {
    expect(accessLevelFrom(state)).toBe("full");
  });

  it.each(READ_ONLY)("%s → read-only", (state) => {
    // Toto je celý nález P1: `limited` nastáva po vypršaní trialu aj po
    // zrušení predplatného a doteraz neznamenalo nič.
    expect(accessLevelFrom(state)).toBe("read_only");
  });

  it("vypršaný trial NEDÁVA plný prístup", () => {
    expect(accessLevelFrom("limited")).not.toBe("full");
  });

  it("skončená ochranná lehota NEDÁVA plný prístup", () => {
    expect(accessLevelFrom("blocked")).not.toBe("full");
  });

  it("neoverený stav predplatného prístup NEVYPÍNA — a je to zámer, nie opomenutie", () => {
    // `getSafeBillingStatus()` prehltne každú chybu Stripe a vráti
    // `hasSubscription: false`. Bez stavu `unknown` by výpadok Stripe prepnul
    // do read-only KAŽDÉHO platiaceho klienta. Z dvoch chýb je vypnutie
    // nástroja platiacemu klientovi tá horšia — a je naša.
    expect(accessLevelFrom("unknown")).toBe("full");
  });

  it("pokrýva každý stav z TrialGraceState, aby nový stav nespadol tichom do read-only", () => {
    // Keď niekto pridá šiesty stav, tento test ho pripomenie — inak by sa
    // nový stav mlčky zaradil medzi read-only, alebo horšie, medzi plné.
    const all: TrialGraceState["state"][] = [...WRITE, ...READ_ONLY, "unknown"];
    expect(new Set(all).size).toBe(6);
    for (const state of all) {
      expect(["full", "read_only"]).toContain(accessLevelFrom(state));
    }
  });
});

describe('oprávnenia tímu — „nevieme" nie je „smie"', () => {
  it("neznámy stav nepovolí NIČ", () => {
    for (const value of Object.values(UNKNOWN_TEAM_PERMISSIONS)) {
      expect(value).toBe(false);
    }
  });

  it("neznámy stav nepovolí export kontaktov", () => {
    // Nález P2: tabuľka `team_member_permissions` v PROD neexistuje, takže
    // čítanie zlyháva vždy a každý člen tímu mal export zapnutý.
    expect(UNKNOWN_TEAM_PERMISSIONS.can_export_contacts).toBe(false);
    expect(UNKNOWN_TEAM_PERMISSIONS.can_see_shared_contacts).toBe(false);
  });

  it("solo default export povoľuje — sú to jeho vlastné kontakty", () => {
    // Zámerne sa NEMENÍ. Pôvodné odporúčanie z auditu („dať všade false") by
    // vzalo solo maklérovi export jeho vlastných dát; opravená je tá cesta,
    // kde maklér tím MÁ a oprávnenia sa nedali prečítať.
    expect(DEFAULT_TEAM_PERMISSIONS.can_export_contacts).toBe(true);
  });

  it("solo default nepovolí zasahovať do cudzieho", () => {
    expect(DEFAULT_TEAM_PERMISSIONS.can_see_colleague_leads).toBe(false);
    expect(DEFAULT_TEAM_PERMISSIONS.can_delete_leads).toBe(false);
    expect(DEFAULT_TEAM_PERMISSIONS.can_edit_colleagues_tasks).toBe(false);
  });

  it("tie dva defaulty nie sú ten istý objekt", () => {
    // Keby boli, celé rozlíšenie „bez tímu" vs „nevieme" je kozmetika.
    expect(UNKNOWN_TEAM_PERMISSIONS).not.toEqual(DEFAULT_TEAM_PERMISSIONS);
  });
});
