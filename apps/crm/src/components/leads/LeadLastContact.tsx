import { formatRelativeContact } from "@/lib/leads/lead-ux";

export function LeadLastContact({ lastContact }: { lastContact?: string | null }) {
  const { label, colorClass } = formatRelativeContact(lastContact);
  return <span className={colorClass}>{label}</span>;
}
