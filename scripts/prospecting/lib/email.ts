import { PERSONAL_EMAIL_DOMAINS } from "./config.ts";

export type EmailClass = "company" | "personal" | "missing";

export function classifyEmail(email: string): EmailClass {
  const t = email.trim().toLowerCase();
  if (!t || !t.includes("@")) return "missing";
  const domain = t.split("@")[1]?.replace(/^www\./, "");
  if (!domain) return "missing";
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return "personal";
  return "company";
}
