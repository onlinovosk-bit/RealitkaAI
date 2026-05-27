import type { Lead } from "@/lib/leads-store";

export type LeadsInventorySnapshot = {
  leads: Lead[];
  teams: { id: string; name: string }[];
  profiles: {
    id: string;
    teamId: string | null;
    fullName: string;
    isActive: boolean;
  }[];
};

export type LeadsInventoryFetchResult =
  | { ok: true; inventory: LeadsInventorySnapshot }
  | { ok: false; status: number; message: string };

/** Načíta inventár cez server route (cookies z prehliadača). */
export async function fetchLeadsInventoryFromApi(): Promise<LeadsInventoryFetchResult> {
  try {
    const res = await fetch("/api/leads/inventory", { credentials: "include" });
    const payload = (await res.json()) as {
      ok?: boolean;
      error?: string;
      inventory?: LeadsInventorySnapshot;
    };

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        message: "Platnosť prihlásenia vypršala. Odhlás sa a prihlás znova.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: payload.error ?? `Inventár leadov zlyhal (HTTP ${res.status}).`,
      };
    }

    if (!payload.inventory) {
      return {
        ok: false,
        status: res.status,
        message: "Odpoveď inventára neobsahuje dáta.",
      };
    }

    return { ok: true, inventory: payload.inventory };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Sieťová chyba pri načítaní inventára leadov.",
    };
  }
}

export type TenantHealthHint = {
  leadsCount: number | null;
  profileAgencyId: string | null;
};

export async function fetchTenantHealthHint(): Promise<TenantHealthHint | null> {
  try {
    const res = await fetch("/api/crm/tenant-health", { credentials: "include" });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      snapshot?: {
        counts?: { leads?: number };
        profileAgencyId?: string | null;
      };
    };
    return {
      leadsCount:
        typeof payload.snapshot?.counts?.leads === "number"
          ? payload.snapshot.counts.leads
          : null,
      profileAgencyId: payload.snapshot?.profileAgencyId ?? null,
    };
  } catch {
    return null;
  }
}
