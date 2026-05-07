import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { autoErrorCapture } from "./auto-error-capture";
import { Resend } from "resend";
import { createActivity } from "@/lib/activities-store";

type SaaSLeadInput = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  agentsCount: number;
  city?: string;
  note?: string;
  source?: string;
  status?: string;
};


  autoErrorCapture("Supabase client initialized", "getSupabaseClient");

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    autoErrorCapture("RESEND_API_KEY is missing", "getResendClient");
    return null;
  }
  autoErrorCapture("Resend client initialized", "getResendClient");
  return new Resend(apiKey);
}

function formatDateSk(date: Date) {
  return date.toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Example usage in async function
export async function safeDemoBookingAction(action: () => Promise<any>, context: string) {
  try {
    const result = await action();
    // captureServerInfo(`Demo booking action succeeded: ${context}`); // Removed: function not defined
    return result;
  } catch (error) {
    // captureServerError(error, `Demo booking action failed: ${context}`); // Removed: function not defined
    throw error;
  }
}

function formatTimeSk(date: Date) {
  return date.toLocaleTimeString("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextBusinessSlot(daysOffset: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);

  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2);
  if (day === 0) date.setDate(date.getDate() + 1);

  return date;
}

export function generateDemoSlots() {
  const slots = [
    nextBusinessSlot(1, 10),
    nextBusinessSlot(2, 14),
    nextBusinessSlot(3, 11),
  ];

  return slots.map((slot) => ({
    iso: slot.toISOString(),
    label: `${formatDateSk(slot)} o ${formatTimeSk(slot)}`,
  }));
}

export async function createDemoBookingTask(input: {
  saasLead: SaaSLeadInput;
  slots: Array<{ iso: string; label: string }>;
}) {
  const supabase = getSupabaseClient();

  const title = `Naplánovať demo pre ${input.saasLead.company}`;
  const description =
    `Nový demo request od ${input.saasLead.name} (${input.saasLead.email}).\n` +
    `Firma: ${input.saasLead.company}\n` +
    `Počet maklérov: ${input.saasLead.agentsCount}\n` +
    `Navrhované termíny:\n- ${input.slots.map((s) => s.label).join("\n- ")}`;

  if (!supabase) {
    return {
      ok: true,
      mode: "fallback",
      title,
    };
  }

  try {
    const { error } = await supabase.from("tasks").insert({
      lead_id: null,
      title,
      description,
      status: "open",
      priority: "high",
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
      mode: "database",
      title,
    };
  } catch (error) {
    console.error("[demo-booking] task insert error:", error);
    return {
      ok: false,
      mode: "database_error",
      title,
    };
  }
}

export async function sendDemoConfirmationEmail(input: {
  saasLead: SaaSLeadInput;
  slots: Array<{ iso: string; label: string }>;
}) {
  const resend = getResendClient();
  const from = process.env.OUTREACH_FROM_EMAIL;
  const bookingUrl = process.env.SALES_CALENDAR_BOOKING_URL || "";

  if (!resend || !from) {
    return {
      ok: false,
      mode: "disabled",
    };
  }

  const subject = `Demo Realitka AI pre ${input.saasLead.company}`;
  const text =
`Dobrý deň ${input.saasLead.name},

ďakujeme za záujem o demo Realitka AI.

Na základe vášho dopytu sme pripravili návrh najbližších termínov:
- ${input.slots[0]?.label || "-"}
- ${input.slots[1]?.label || "-"}
- ${input.slots[2]?.label || "-"}

${bookingUrl ? `Rezervácia termínu: ${bookingUrl}` : `Odpovedzte na tento email a vyberieme vám vhodný termín.`}

Počas dema vám ukážeme:
- AI scoring leadov
- matching klient ↔ nehnuteľnosť
- outreach automatizáciu
- forecasting a benchmarky
- tímové riadenie realitky

S pozdravom
Tím Realitka AI`;

  try {
    const result = await resend.emails.send({
      from,
      to: input.saasLead.email,
      subject,
      text,
    });

    if ((result as { error?: { message?: string } }).error) {
      throw new Error((result as { error?: { message?: string } }).error?.message || "Email send failed");
    }

    return {
      ok: true,
      mode: "resend",
      subject,
    };
  } catch (error) {
    console.error("[demo-booking] email send error:", error);
    return {
      ok: false,
      mode: "resend_error",
      subject,
    };
  }
}

export async function runDemoBookingAutomation(saasLead: SaaSLeadInput) {
  const slots = generateDemoSlots();

  const [taskResult, emailResult] = await Promise.all([
    createDemoBookingTask({ saasLead, slots }),
    sendDemoConfirmationEmail({ saasLead, slots }),
  ]);

  try {
    await createActivity({
      leadId: null,
      type: "Sales Funnel",
      title: "Spustená demo booking automatizácia",
      text: `Pre firmu ${saasLead.company} sa spustila automatizácia plánovania dema.`,
      entityType: "saas_lead",
      entityId: saasLead.id,
      actorName: saasLead.name,
      source: "sales",
      severity: "success",
      meta: {
        slots,
        taskResult,
        emailResult,
      },
    });
  } catch (error) {
    console.error("[demo-booking] activity log error:", error);
  }

  return {
    ok: true,
    slots,
    taskResult,
    emailResult,
  };
}
