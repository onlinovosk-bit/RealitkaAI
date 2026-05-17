"""
Revolis.AI – Shared Pydantic models and base contracts.
All MCP servers import from here. Change once, reflected everywhere.
"""
from __future__ import annotations
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────
# Meta / envelope
# ──────────────────────────────────────────────────────────────

class ToolError(BaseModel):
    code: str                     # e.g. "LEAD_NOT_FOUND"
    message: str
    details: Optional[dict] = None

class ToolResponse(BaseModel):
    """
    Standard envelope for every tool response.
    If `error` is set, `data` should be None (and vice-versa).
    """
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    success: bool
    data: Optional[Any] = None
    error: Optional[ToolError] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────────────────────
# CRM domain
# ──────────────────────────────────────────────────────────────

class LeadStatus(str, Enum):
    NEW        = "new"
    CONTACTED  = "contacted"
    QUALIFIED  = "qualified"
    VIEWING    = "viewing"
    NEGOTIATING = "negotiating"
    CLOSED_WON  = "closed_won"
    CLOSED_LOST = "closed_lost"

class LeadSource(str, Enum):
    WEBSITE   = "website"
    REFERRAL  = "referral"
    PORTAL    = "portal"       # e.g. Nehnutelnosti.sk, Reality.sk
    COLD_CALL = "cold_call"
    SOCIAL    = "social"

class Lead(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.WEBSITE
    property_type: Optional[str] = None   # "apartment", "house", "land"
    budget_eur: Optional[int] = None
    location_preference: Optional[str] = None
    notes: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    budget_eur: Optional[int] = None
    phone: Optional[str] = None

class LeadFilter(BaseModel):
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    assigned_agent_id: Optional[str] = None
    min_budget_eur: Optional[int] = None
    max_budget_eur: Optional[int] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# ──────────────────────────────────────────────────────────────
# Communication domain
# ──────────────────────────────────────────────────────────────

class EmailPayload(BaseModel):
    to: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    reply_to: Optional[str] = None
    lead_id: Optional[str] = None
    template_id: Optional[str] = None    # future: template engine

class SmsPayload(BaseModel):
    to_phone: str                         # E.164 format: +421...
    message: str = Field(max_length=1600)
    lead_id: Optional[str] = None
    sender_id: Optional[str] = None       # e.g. "Revolis"

class InteractionType(str, Enum):
    EMAIL = "email"
    SMS   = "sms"
    CALL  = "call"
    NOTE  = "note"
    VIEWING = "viewing"

class InteractionLog(BaseModel):
    lead_id: str
    interaction_type: InteractionType
    summary: str
    agent_id: Optional[str] = None
    metadata: Optional[dict] = None       # raw provider response, message SID, etc.


# ──────────────────────────────────────────────────────────────
# Calendar domain
# ──────────────────────────────────────────────────────────────

class TimeSlot(BaseModel):
    start: datetime
    end: datetime
    available: bool = True
    location: Optional[str] = None

class CalendarEvent(BaseModel):
    title: str
    start: datetime
    end: datetime
    attendee_emails: list[str]
    location: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    agent_id: Optional[str] = None
    google_event_id: Optional[str] = None   # filled after real integration

class FindSlotsRequest(BaseModel):
    agent_id: str
    date_from: datetime
    date_to: datetime
    duration_minutes: int = Field(default=60, ge=15, le=240)
    location: Optional[str] = None


# ──────────────────────────────────────────────────────────────
# Telephony domain
# ──────────────────────────────────────────────────────────────

class CallDirection(str, Enum):
    OUTBOUND = "outbound"
    INBOUND  = "inbound"

class CallStatus(str, Enum):
    QUEUED      = "queued"
    INITIATED   = "initiated"
    RINGING     = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    FAILED      = "failed"
    NO_ANSWER   = "no_answer"

class CallRecord(BaseModel):
    call_id: str
    lead_id: str
    agent_id: Optional[str] = None
    direction: CallDirection = CallDirection.OUTBOUND
    to_phone: str
    from_phone: str
    status: CallStatus = CallStatus.QUEUED
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    initiated_at: datetime = Field(default_factory=datetime.utcnow)
