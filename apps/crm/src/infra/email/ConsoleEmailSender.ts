// src/infra/email/ConsoleEmailSender.ts
// Replace with Resend/Mailgun implementation

import type { EmailSender } from "@/domain/outbound/OutboundCampaign";

class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    const preview = body.length > 120 ? body.slice(0, 120) + "..." : body;
    console.log(
      [
        "─────────────────────────────────────────",
        `[EMAIL] TO:      ${to}`,
        `[EMAIL] SUBJECT: ${subject}`,
        `[EMAIL] BODY:    ${preview}`,
        "─────────────────────────────────────────",
      ].join("\n"),
    );
  }
}

export function createConsoleEmailSender(): EmailSender {
  return new ConsoleEmailSender();
}
