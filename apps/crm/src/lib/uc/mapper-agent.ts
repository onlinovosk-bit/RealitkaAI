import { normalizePhone } from "@/lib/import/contacts-import-core";
import { UC_AGENT_KNOWN_FIELDS } from "@/lib/uc/field-catalog";
import { coerceBool, coerceString, isRecord, partitionKnownFields } from "@/lib/uc/shared";

export type UcAgentImage = {
  url: string | null;
  changed: boolean;
};

export type UcAgentMapped = {
  externalId: string;
  fullName: string;
  phone: string;
  phoneStatus: "sk" | "intl" | "empty" | "unparseable";
  email: string;
  sora: boolean;
  nark: boolean;
  deleted: boolean;
  image: UcAgentImage;
  raw: Record<string, unknown>;
};

export class UcMapperValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "UcMapperValidationError";
    this.field = field;
  }
}

function parseImage(value: unknown): UcAgentImage {
  if (!isRecord(value)) return { url: null, changed: false };
  return {
    url: coerceString(value.url),
    changed: coerceBool(value.changed),
  };
}

export function mapUcAgentPayload(data: Record<string, unknown>): UcAgentMapped {
  const externalId =
    coerceString(data.user_id) ?? coerceString(data.import_id);
  if (!externalId) {
    throw new UcMapperValidationError("user_id", "Missing required user_id");
  }

  const fullName = coerceString(data.full_name);
  if (!fullName) {
    throw new UcMapperValidationError("full_name", "Missing required full_name");
  }

  const phoneRaw = coerceString(data.phone_work) ?? "";
  const phoneResult = normalizePhone(phoneRaw);

  const email = coerceString(data.email_work) ?? "";
  const partitioned = partitionKnownFields(data, UC_AGENT_KNOWN_FIELDS);

  return {
    externalId,
    fullName,
    phone: phoneResult.phone,
    phoneStatus: phoneResult.status,
    email,
    sora: coerceBool(data.sora),
    nark: coerceBool(data.nark),
    deleted: coerceBool(data.deleted),
    image: parseImage(data.image),
    raw: partitioned.raw,
  };
}
