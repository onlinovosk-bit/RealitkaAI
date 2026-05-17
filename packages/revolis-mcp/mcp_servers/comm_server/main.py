"""
Revolis.AI – Communication MCP Server
======================================
Tools:
  • send_email      – transactional email via provider (SendGrid / Mailjet)
  • send_sms        – SMS via Twilio or similar
  • log_interaction – write interaction record to CRM audit trail

Real integrations: fill in the TODO blocks with real SDK calls.
"""
import os
import sys
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from shared.models import (
    EmailPayload, SmsPayload, InteractionLog, InteractionType,
    ToolResponse, ToolError,
)
from shared.logging_utils import get_logger, set_request_context

logger = get_logger("comm_server")

app = FastAPI(
    title="Revolis.AI – Communication MCP Server",
    version="0.1.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID", str(uuid4()))
    set_request_context(rid)
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


# ──────────────────────────────────────────────────────────────
# Tool manifest
# ──────────────────────────────────────────────────────────────
@app.get("/tools")
async def list_tools():
    return {
        "server_name": "comm_server",
        "version": "0.1.0",
        "tools": [
            {
                "name": "send_email",
                "description": "Send a transactional email to a lead or agent.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "to":          {"type": "string", "description": "Recipient email address"},
                        "subject":     {"type": "string"},
                        "body_html":   {"type": "string"},
                        "body_text":   {"type": "string"},
                        "lead_id":     {"type": "string"},
                        "template_id": {"type": "string"},
                    },
                    "required": ["to", "subject", "body_html"],
                },
            },
            {
                "name": "send_sms",
                "description": "Send an SMS to a lead. Phone must be E.164 format (+421...).",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "to_phone":  {"type": "string"},
                        "message":   {"type": "string", "maxLength": 1600},
                        "lead_id":   {"type": "string"},
                        "sender_id": {"type": "string"},
                    },
                    "required": ["to_phone", "message"],
                },
            },
            {
                "name": "log_interaction",
                "description": "Append an interaction record to the CRM audit trail for a lead.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "lead_id":          {"type": "string"},
                        "interaction_type": {"type": "string", "enum": [e.value for e in InteractionType]},
                        "summary":          {"type": "string"},
                        "agent_id":         {"type": "string"},
                        "metadata":         {"type": "object"},
                    },
                    "required": ["lead_id", "interaction_type", "summary"],
                },
            },
        ],
    }


# ──────────────────────────────────────────────────────────────
# Tool: send_email
# ──────────────────────────────────────────────────────────────
@app.post("/tools/send_email", response_model=ToolResponse)
async def send_email(payload: EmailPayload):
    set_request_context(str(uuid4()), lead_id=payload.lead_id)
    logger.info(f"send_email → {payload.to} | subject: {payload.subject}")

    try:
        # ── TODO: real provider integration ──────────────────────
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # client = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
        # message = Mail(
        #     from_email=os.environ["FROM_EMAIL"],
        #     to_emails=payload.to,
        #     subject=payload.subject,
        #     html_content=payload.body_html,
        # )
        # sg_response = client.send(message)
        # provider_message_id = sg_response.headers.get("X-Message-Id")
        # ──────────────────────────────────────────────────────────

        provider_message_id = f"mock-email-{uuid4()}"   # stub
        logger.info(f"Email sent (mock) | message_id={provider_message_id}")

        return ToolResponse(
            success=True,
            data={"message_id": provider_message_id, "to": payload.to, "provider": "mock"},
        )

    except Exception as exc:
        logger.error(f"send_email failed: {exc}")
        return ToolResponse(
            success=False,
            error=ToolError(code="EMAIL_SEND_FAILED", message=str(exc)),
        )


# ──────────────────────────────────────────────────────────────
# Tool: send_sms
# ──────────────────────────────────────────────────────────────
@app.post("/tools/send_sms", response_model=ToolResponse)
async def send_sms(payload: SmsPayload):
    set_request_context(str(uuid4()), lead_id=payload.lead_id)
    logger.info(f"send_sms → {payload.to_phone} | chars={len(payload.message)}")

    if not payload.to_phone.startswith("+"):
        return ToolResponse(
            success=False,
            error=ToolError(
                code="INVALID_PHONE",
                message="Phone number must be in E.164 format (e.g. +421901123456).",
            ),
        )

    try:
        # ── TODO: real Twilio integration ────────────────────────
        # from twilio.rest import Client
        # client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
        # msg = client.messages.create(
        #     body=payload.message,
        #     from_=os.environ["TWILIO_FROM_NUMBER"],
        #     to=payload.to_phone,
        # )
        # sms_sid = msg.sid
        # ──────────────────────────────────────────────────────────

        sms_sid = f"SM-mock-{uuid4()}"   # stub
        logger.info(f"SMS sent (mock) | sid={sms_sid}")

        return ToolResponse(
            success=True,
            data={"sms_sid": sms_sid, "to": payload.to_phone, "provider": "mock"},
        )

    except Exception as exc:
        logger.error(f"send_sms failed: {exc}")
        return ToolResponse(
            success=False,
            error=ToolError(code="SMS_SEND_FAILED", message=str(exc)),
        )


# ──────────────────────────────────────────────────────────────
# Tool: log_interaction
# ──────────────────────────────────────────────────────────────

# In-memory audit log (replace with DB write or CRM API call)
_INTERACTION_LOG: list[dict] = []

@app.post("/tools/log_interaction", response_model=ToolResponse)
async def log_interaction(payload: InteractionLog):
    set_request_context(str(uuid4()), lead_id=payload.lead_id)
    logger.info(f"log_interaction | type={payload.interaction_type} lead={payload.lead_id}")

    try:
        # ── TODO: write to real CRM / database ──────────────────
        # await crm_client.create_activity(
        #     contact_id=payload.lead_id,
        #     activity_type=payload.interaction_type,
        #     note=payload.summary,
        # )
        # ──────────────────────────────────────────────────────────

        record = payload.model_dump()
        record["interaction_id"] = str(uuid4())
        _INTERACTION_LOG.append(record)   # stub

        return ToolResponse(
            success=True,
            data={"interaction_id": record["interaction_id"]},
        )

    except Exception as exc:
        logger.error(f"log_interaction failed: {exc}")
        return ToolResponse(
            success=False,
            error=ToolError(code="LOG_FAILED", message=str(exc)),
        )


@app.get("/health")
async def health():
    return {"status": "ok", "server": "comm_server"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("COMM_SERVER_PORT", "8002")),
        reload=os.getenv("ENV", "dev") == "dev",
    )
