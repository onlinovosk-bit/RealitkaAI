/**
 * SMO-B04 — kontrakt aktívneho stavu a freshness.
 *
 * Tretia (posledná) časť PASS kritéria z registra blokujúcich podmienok.
 * Prvé dve — tenant scope a cross-tenant negatívny test — sú v #569.
 *
 * Ťažisko: kontrakt musí byť **fail-closed**. Nie je to opatrnosť navyše —
 * `properties` sú snímka Realvie v čase syncu. Keď sync vypadne, riadok
 * v DB ostane a bude vyzerať platne. Verejný matcher by ukázal predanú
 * nehnuteľnosť ako dostupnú, čo nie je chyba zobrazenia, ale klamný inzerát.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_AGE_DAYS,
  evaluatePublicVisibility,
  isPubliclyVisible,
  maxAgeDays,
} from "../public-visibility";

const NOW = new Date("2026-09-17T12:00:00.000Z");

/** Izolované prostredie — testy nesmú závisieť od toho, čo má v env CI. */
function env(values: Record<string, string> = {}): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("SMO-B04 — aktívny stav", () => {
  it("aktívna a čerstvá ponuka smie von", () => {
    const result = evaluatePublicVisibility(
      { status: "Aktívna", realviaUpdatedAt: daysAgo(1) },
      NOW,
      env(),
    );
    expect(result).toMatchObject({ visible: true, reason: "ok" });
    expect(result.ageDays).toBeCloseTo(1, 5);
  });

  it.each(["aktívna", "aktivna", "active", "aktivní", "aktivni", "  Aktívna  "])(
    "uznáva pravopis %s — reálne dáta nemajú jednotný zápis",
    (status) => {
      expect(isPubliclyVisible({ status, realviaUpdatedAt: daysAgo(1) }, NOW, env())).toBe(true);
    },
  );

  it.each(["Predaná", "Prenajatá", "Stiahnutá", "sold", "draft", ""])(
    "stav %s von NEIDE",
    (status) => {
      expect(evaluatePublicVisibility({ status, realviaUpdatedAt: daysAgo(1) }, NOW, env())).toMatchObject({
        visible: false,
        reason: "status_not_active",
      });
    },
  );

  it("Rezervovaná von NEIDE — ponúknuť ju verejne je sľub, ktorý sa nemusí dať dodržať", () => {
    expect(
      evaluatePublicVisibility({ status: "Rezervovaná", realviaUpdatedAt: daysAgo(1) }, NOW, env()),
    ).toMatchObject({ visible: false, reason: "status_not_active" });
  });

  it("neznámy stav von NEIDE — whitelist, nie blacklist", () => {
    expect(
      evaluatePublicVisibility({ status: "Čosi Nové Z Importu", realviaUpdatedAt: daysAgo(1) }, NOW, env()),
    ).toMatchObject({ visible: false, reason: "status_not_active" });
  });
});

describe("SMO-B04 — freshness", () => {
  it("presne na hranici ešte prejde", () => {
    expect(
      isPubliclyVisible({ status: "Aktívna", realviaUpdatedAt: daysAgo(DEFAULT_MAX_AGE_DAYS) }, NOW, env()),
    ).toBe(true);
  });

  it("deň za hranicou už neprejde a vráti vek", () => {
    const result = evaluatePublicVisibility(
      { status: "Aktívna", realviaUpdatedAt: daysAgo(DEFAULT_MAX_AGE_DAYS + 1) },
      NOW,
      env(),
    );
    expect(result).toMatchObject({ visible: false, reason: "stale" });
    expect(result.ageDays).toBeCloseTo(DEFAULT_MAX_AGE_DAYS + 1, 5);
  });

  it("chýbajúci čas syncu = NEZOBRAZIŤ, nie 'asi čerstvé'", () => {
    for (const stamp of [undefined, null, ""]) {
      expect(
        evaluatePublicVisibility({ status: "Aktívna", realviaUpdatedAt: stamp }, NOW, env()),
      ).toMatchObject({ visible: false, reason: "freshness_unknown" });
    }
  });

  it("nečitateľný dátum = NEZOBRAZIŤ", () => {
    expect(
      evaluatePublicVisibility({ status: "Aktívna", realviaUpdatedAt: "včera" }, NOW, env()),
    ).toMatchObject({ visible: false, reason: "freshness_unparsable" });
  });

  it("budúci timestamp neblokuje, ale vek nehlási záporný", () => {
    const result = evaluatePublicVisibility(
      { status: "Aktívna", realviaUpdatedAt: daysAgo(-2) },
      NOW,
      env(),
    );
    expect(result.visible).toBe(true);
    expect(result.ageDays).toBe(0);
  });
});

describe("SMO-B04 — nastaviteľné okno", () => {
  it("PUBLIC_LISTING_MAX_AGE_DAYS prepíše default", () => {
    const stamp = daysAgo(10);
    expect(isPubliclyVisible({ status: "Aktívna", realviaUpdatedAt: stamp }, NOW, env())).toBe(false);
    expect(
      isPubliclyVisible({ status: "Aktívna", realviaUpdatedAt: stamp }, NOW, env({ PUBLIC_LISTING_MAX_AGE_DAYS: "30" })),
    ).toBe(true);
  });

  it.each(["", "0", "-5", "nezmysel"])(
    "nezmyselná hodnota %s padá späť na default, nie na 'bez limitu'",
    (raw) => {
      expect(maxAgeDays(env({ PUBLIC_LISTING_MAX_AGE_DAYS: raw }))).toBe(
        DEFAULT_MAX_AGE_DAYS,
      );
    },
  );
});
