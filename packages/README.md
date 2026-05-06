# Revolis.AI — MCP Servers

Four Model Context Protocol servers that give AI sub-agents tool-level access to CRM, communications, calendar, and telephony.

## Structure

```
packages/
├── mcp-shared/          # Shared TypeScript types + logger (all servers depend on this)
├── mcp-crm/             # CRM server — get_lead, update_lead, list_leads_by_filter
├── mcp-comm/            # Communication server — send_email, send_sms, log_interaction
├── mcp-calendar/        # Calendar server — find_available_slots, create_event
├── mcp-telephony/       # Telephony server — initiate_call, get_call_transcript
├── mcp-config.json      # Claude Desktop / Claude Code client config (example)
├── docker-compose.yml   # Local integration testing
└── .env.example         # All required environment variables
```

## Dev — run a server locally

```bash
# 1. Install all workspace deps from monorepo root
npm install

# 2. Build shared types first
npm run build --workspace=packages/mcp-shared

# 3. Start any server in watch mode (tsx reloads on save)
npm run dev --workspace=packages/mcp-crm
npm run dev --workspace=packages/mcp-comm
npm run dev --workspace=packages/mcp-calendar
npm run dev --workspace=packages/mcp-telephony
```

## Register with Claude Desktop

Copy the contents of `mcp-config.json` into your Claude Desktop config:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac:** `~/.config/claude/claude_desktop_config.json`

Replace all `${VAR}` placeholders with real values, or point them at a `.env` file your shell has already sourced.

## Register with Claude Code (CLI)

```bash
# from the monorepo root, after building:
claude mcp add revolis-crm  node packages/mcp-crm/dist/server.js
claude mcp add revolis-comm node packages/mcp-comm/dist/server.js
claude mcp add revolis-calendar  node packages/mcp-calendar/dist/server.js
claude mcp add revolis-telephony node packages/mcp-telephony/dist/server.js
```

## Tool contracts (JSON schema)

Each tool has a strict JSON schema enforced at the SDK level. All responses follow the `ToolResponse<T>` envelope:

```json
{
  "success": true,
  "request_id": "uuid-v4",
  "data": { ... },
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "request_id": "uuid-v4",
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "No lead with id=xyz",
    "details": null
  }
}
```

## Extending handlers to call real APIs

### mcp-crm → Supabase

In `src/store/in-memory.ts`, replace each exported function with a Supabase query:

```ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function getLead(id: string) {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
```

### mcp-comm → Resend (email)

In `src/tools/send-email.ts`, uncomment and fill the `TODO` block:

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const { id } = await resend.emails.send({ from: process.env.EMAIL_FROM!, to: to_email, subject, html: body_html });
```

### mcp-comm → Twilio (SMS)

```ts
import twilio from "twilio";
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const msg = await client.messages.create({ body, from: process.env.TWILIO_FROM_NUMBER!, to: to_phone });
```

### mcp-calendar → Google Calendar

```ts
import { google } from "googleapis";
const auth = google.auth.fromJSON(JSON.parse(Buffer.from(process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON!, "base64").toString()));
const cal = google.calendar({ version: "v3", auth });
const { data } = await cal.events.insert({ calendarId: agent_id, requestBody: { ... } });
```

### mcp-telephony → Twilio Voice + Deepgram

```ts
// initiate_call
const call = await client.calls.create({ to: to_phone, from: process.env.TWILIO_FROM_NUMBER!, url: twiml_url, record: true });

// get_call_transcript — use Twilio Intelligence or Deepgram callback
const transcripts = await client.intelligence.v2.transcripts.list({ callSid: call_id });
```

## Docker build

```bash
# build individual server image
docker build -f packages/mcp-crm/Dockerfile -t revolis-mcp-crm .

# run all servers for smoke-testing
docker compose -f packages/docker-compose.yml up --build
```

## Observability

All servers log structured JSON to **stderr** (stdout is reserved for MCP protocol frames):

```json
{"level":"INFO","ts":"2026-05-06T10:00:00Z","server":"mcp-crm","tool":"get_lead","lead_id":"lead-001","request_id":"abc-123","msg":"get_lead called"}
```

Pipe stderr to Datadog, Loki, or any log aggregator in your Docker/K8s setup.
