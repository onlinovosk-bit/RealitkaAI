import type { ImportTargetField } from "@/lib/universal-import/types";

export const TARGET_FIELD_OPTIONS: Array<{ value: ImportTargetField; label: string }> = [
  { value: "skip", label: "— ignorovať —" },
  { value: "contact_name", label: "Meno" },
  { value: "phone", label: "Telefón" },
  { value: "email", label: "Email" },
  { value: "address", label: "Adresa / lokalita" },
  { value: "note", label: "Poznámka" },
  { value: "budget", label: "Rozpočet" },
  { value: "status", label: "Stav" },
  { value: "source", label: "Zdroj" },
  { value: "assigned_agent", label: "Maklér" },
  { value: "property_type", label: "Typ nehnuteľnosti" },
  { value: "property_area", label: "Plocha" },
];
