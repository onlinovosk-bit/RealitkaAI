import { z } from "zod";

const looseString = z
  .union([z.string(), z.number(), z.boolean()])
  .optional()
  .nullable()
  .transform((v) => (v == null ? null : String(v).trim() || null));

const archivedSchema = z
  .union([z.literal(0), z.literal(1), z.literal("0"), z.literal("1"), z.boolean()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === true || v === 1 || v === "1") return 1 as const;
    if (v === false || v === 0 || v === "0") return 0 as const;
    return null;
  });

const ownerStatusSchema = z
  .union([z.literal("active"), z.literal("finished"), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const lower = String(v).toLowerCase();
    if (lower === "active" || lower === "finished") return lower as "active" | "finished";
    return null;
  });

const ownerTypeSchema = z
  .union([
    z.literal("vlastnik"),
    z.literal("zaujemca"),
    z.literal("blacklist"),
    z.string(),
  ])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const lower = String(v).toLowerCase();
    if (lower === "vlastnik" || lower === "zaujemca" || lower === "blacklist") {
      return lower as "vlastnik" | "zaujemca" | "blacklist";
    }
    return null;
  });

export const RealviaAddressSchema = z
  .object({
    street: looseString,
    city: looseString,
    zip: looseString,
    number: looseString,
    companyName: looseString,
    vat: looseString,
    tax: looseString,
    taxic: looseString,
    taxId: looseString,
  })
  .passthrough();

export const RealviaInterestSchema = z
  .object({
    type: z.union([z.number(), z.string()]).optional().nullable(),
    category: z.union([z.number(), z.string()]).optional().nullable(),
  })
  .passthrough();

export const RealviaNoteSchema = z
  .union([
    z.string(),
    z
      .object({
        text: looseString,
        body: looseString,
        content: looseString,
        created: looseString,
        updated: looseString,
      })
      .passthrough(),
  ])
  .transform((v) => {
    if (typeof v === "string") {
      return { text: v.trim() || null, created: null, updated: null };
    }
    const text = v.text ?? v.body ?? v.content ?? null;
    return { text, created: v.created ?? null, updated: v.updated ?? null };
  });

export const RealviaInspectionSchema = z
  .object({
    date: looseString,
    created: looseString,
    updated: looseString,
    propertyAddress: looseString,
    address: looseString,
    note: looseString,
    text: looseString,
    status: looseString,
  })
  .passthrough();

export const RealviaOwnerSchema = z
  .object({
    name: looseString,
    archived: archivedSchema,
    status: ownerStatusSchema,
    created: looseString,
    updated: looseString,
    type: ownerTypeSchema,
    email: looseString,
    phone: looseString,
    postalAddress: RealviaAddressSchema.optional().nullable(),
    invoiceAddress: RealviaAddressSchema.optional().nullable(),
    interests: z
      .union([RealviaInterestSchema, z.array(RealviaInterestSchema)])
      .optional()
      .nullable()
      .transform((v) => {
        if (!v) return [];
        return Array.isArray(v) ? v : [v];
      }),
    notes: z.array(RealviaNoteSchema).optional().nullable().default([]),
    inspections: z.array(RealviaInspectionSchema).optional().nullable().default([]),
  })
  .passthrough();

export const RealviaClientSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional().nullable(),
    owner: RealviaOwnerSchema,
  })
  .passthrough();

export type RealviaAddress = z.infer<typeof RealviaAddressSchema>;
export type RealviaOwner = z.infer<typeof RealviaOwnerSchema>;
export type RealviaClient = z.infer<typeof RealviaClientSchema>;
export type RealviaNote = z.infer<typeof RealviaNoteSchema>;
export type RealviaInspection = z.infer<typeof RealviaInspectionSchema>;

export type RealviaParseWarning = {
  index: number;
  path: string;
  message: string;
};

export type RealviaParseResult = {
  clients: RealviaClient[];
  warnings: RealviaParseWarning[];
};

function collectUnknownKeys(
  raw: Record<string, unknown>,
  known: Set<string>,
  index: number,
  prefix: string,
  warnings: RealviaParseWarning[],
) {
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      warnings.push({
        index,
        path: `${prefix}.${key}`,
        message: `Neznáme pole ignorované: ${key}`,
      });
    }
  }
}

export function parseRealviaClient(raw: unknown, index = 0): {
  client: RealviaClient | null;
  warnings: RealviaParseWarning[];
} {
  const warnings: RealviaParseWarning[] = [];
  const parsed = RealviaClientSchema.safeParse(raw);

  if (!parsed.success) {
    warnings.push({
      index,
      path: "owner",
      message: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return { client: null, warnings };
  }

  if (raw && typeof raw === "object") {
    collectUnknownKeys(
      raw as Record<string, unknown>,
      new Set(["id", "owner"]),
      index,
      "client",
      warnings,
    );
    const ownerRaw = (raw as Record<string, unknown>).owner;
    if (ownerRaw && typeof ownerRaw === "object") {
      collectUnknownKeys(
        ownerRaw as Record<string, unknown>,
        new Set([
          "name",
          "archived",
          "status",
          "created",
          "updated",
          "type",
          "email",
          "phone",
          "postalAddress",
          "invoiceAddress",
          "interests",
          "notes",
          "inspections",
        ]),
        index,
        "owner",
        warnings,
      );
    }
  }

  return { client: parsed.data, warnings };
}

export function parseRealviaJsonPayload(raw: unknown): RealviaParseResult {
  const warnings: RealviaParseWarning[] = [];
  const clients: RealviaClient[] = [];

  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.clients)) {
      items = obj.clients;
    } else if (obj.owner) {
      items = [raw];
    }
  }

  items.forEach((item, index) => {
    const result = parseRealviaClient(item, index);
    warnings.push(...result.warnings);
    if (result.client) clients.push(result.client);
  });

  return { clients, warnings };
}

export function parseRealviaJsonText(text: string): RealviaParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      clients: [],
      warnings: [
        {
          index: -1,
          path: "json",
          message: err instanceof Error ? err.message : "Neplatný JSON",
        },
      ],
    };
  }
  return parseRealviaJsonPayload(raw);
}
