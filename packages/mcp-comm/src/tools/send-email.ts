import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse } from "@revolis/mcp-shared";

export const sendEmailTool: Tool = {
  name: "send_email",
  description: "Send a transactional email to a lead. Uses the configured email provider (Resend / SendGrid).",
  inputSchema: {
    type: "object",
    properties: {
      lead_id:    { type: "string", description: "Lead receiving the email." },
      to_email:   { type: "string", format: "email" },
      subject:    { type: "string", maxLength: 200 },
      body_html:  { type: "string", description: "HTML body of the email." },
      body_text:  { type: "string", description: "Plain-text fallback." },
      reply_to:   { type: "string", format: "email" },
      agent_id:   { type: "string", description: "Sending agent (for attribution)." },
      template_id:{ type: "string", description: "Optional provider template ID." },
      metadata:   { type: "object", additionalProperties: true },
    },
    required: ["lead_id", "to_email", "subject", "body_html"],
    additionalProperties: false,
  },
};

interface SendEmailArgs {
  lead_id: string;
  to_email: string;
  subject: string;
  body_html: string;
  body_text?: string;
  reply_to?: string;
  agent_id?: string;
  template_id?: string;
  metadata?: Record<string, unknown>;
}

interface SendEmailResult {
  message_id: string;
  provider: string;
  queued_at: string;
}

export async function handleSendEmail(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id, to_email, subject, agent_id } = args as SendEmailArgs;

  const log = createLogger({ request_id, server: "mcp-comm", tool: "send_email", lead_id, agent_id });
  log.info("send_email called", { to: to_email, subject });

  try {
    // TODO: Replace with real provider call.
    // Example (Resend):
    //   const resend = new Resend(process.env.RESEND_API_KEY);
    //   const { id } = await resend.emails.send({ from, to, subject, html: body_html });
    //
    // Example (SendGrid):
    //   await sgMail.send({ to, from, subject, html: body_html, text: body_text });

    const mockResult: SendEmailResult = {
      message_id: `mock-email-${Date.now()}`,
      provider: "mock",
      queued_at: new Date().toISOString(),
    };

    log.info("send_email success", { message_id: mockResult.message_id });

    const response: ToolResponse<SendEmailResult> = { success: true, data: mockResult, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("send_email failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "EMAIL_SEND_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
