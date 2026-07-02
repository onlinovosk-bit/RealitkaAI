import { Resend } from "resend";

export async function sendDemoOpsEmail(subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  const to = process.env.DEMO_OPS_ANDY_EMAIL;

  if (!apiKey?.startsWith("re_")) return { ok: false, error: "RESEND_API_KEY missing" };
  if (!from) return { ok: false, error: "OUTREACH_FROM_EMAIL missing" };
  if (!to) return { ok: false, error: "DEMO_OPS_ANDY_EMAIL missing" };

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, text });
  if ((result as { error?: { message?: string } }).error) {
    return {
      ok: false,
      error: (result as { error?: { message?: string } }).error?.message ?? "Resend error",
    };
  }
  return { ok: true };
}
