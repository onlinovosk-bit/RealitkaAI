"""
Revolis.AI – Structured logging with request_id and lead_id context.
Uses Python's standard structlog-style dict logging so it's easy to
ship to Datadog, Loki, or CloudWatch later.
"""
import logging
import json
import sys
from contextvars import ContextVar
from typing import Optional

# Thread-local context vars (work with FastAPI's async too)
_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="—")
_lead_id_ctx: ContextVar[Optional[str]] = ContextVar("lead_id", default=None)

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": _request_id_ctx.get("—"),
            "lead_id": _lead_id_ctx.get(None),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

def set_request_context(request_id: str, lead_id: Optional[str] = None):
    _request_id_ctx.set(request_id)
    _lead_id_ctx.set(lead_id)

def clear_request_context():
    _request_id_ctx.set("—")
    _lead_id_ctx.set(None)
