import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

interface HubSpotWebhookEvent {
  eventId: number
  subscriptionId: number
  portalId: number
  appId: number
  occurredAt: number
  subscriptionType: string
  attemptNumber: number
  objectId: number
  propertyName?: string
  propertyValue?: string
  changeSource?: string
}

function verifyHubSpotSignature(
  secret: string,
  method: string,
  uri: string,
  body: string,
  timestamp: string,
  receivedSig: string
): boolean {
  const payload = method + uri + body + timestamp
  const expected = createHmac("sha256", secret).update(payload).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(receivedSig, "hex"))
  } catch {
    return false
  }
}

function processEventsAsync(events: HubSpotWebhookEvent[]): void {
  Promise.resolve().then(() => {
    for (const event of events) {
      if (
        event.subscriptionType === "contact.propertyChange" &&
        event.propertyName === "hs_lead_status"
      ) {
        console.log(
          `[HubSpot] contact.propertyChange hs_lead_status | objectId=${event.objectId} value=${event.propertyValue} portalId=${event.portalId}`
        )
      } else if (
        event.subscriptionType === "deal.propertyChange" &&
        event.propertyName === "dealstage"
      ) {
        console.log(
          `[HubSpot] deal.propertyChange dealstage | objectId=${event.objectId} value=${event.propertyValue} portalId=${event.portalId}`
        )
      }
    }
  }).catch((err) => {
    console.error("[HubSpot] processEventsAsync error:", err)
  })
}

export async function POST(request: Request) {
  const secret = process.env.HUBSPOT_WEBHOOK_SECRET

  const body = await request.text()

  if (secret) {
    const sig = request.headers.get("x-hubspot-signature-v3")
    const timestamp = request.headers.get("x-hubspot-request-timestamp") ?? ""

    if (!sig) {
      return new NextResponse("Missing x-hubspot-signature-v3", { status: 403 })
    }

    // HubSpot requires the full request URI; reconstruct from request.url
    const url = new URL(request.url)
    const uri = url.origin + url.pathname + url.search

    if (!verifyHubSpotSignature(secret, "POST", uri, body, timestamp, sig)) {
      return new NextResponse("Invalid signature", { status: 403 })
    }
  } else {
    console.warn("[HubSpot] HUBSPOT_WEBHOOK_SECRET not set — skipping signature verification")
  }

  let events: HubSpotWebhookEvent[]
  try {
    events = JSON.parse(body)
    if (!Array.isArray(events)) {
      events = [events]
    }
  } catch {
    // Malformed payload — still 200 to avoid HubSpot retry storm
    console.error("[HubSpot] Failed to parse webhook payload")
    return NextResponse.json({ ok: true })
  }

  processEventsAsync(events)

  return NextResponse.json({ ok: true })
}
