"""Shared network configuration for the backend services."""

import os
from urllib.parse import urlsplit


def frontend_origins() -> list[str]:
    """Return explicitly configured frontend origins for direct API access."""
    configured = os.getenv("FRONTEND_ORIGINS", "")
    origins = []
    for value in configured.split(","):
        value = value.strip().rstrip("/")
        if not value:
            continue
        parsed = urlsplit(value)
        if parsed.scheme in {"http", "https"} and parsed.netloc and not parsed.path:
            origins.append(value)

    if origins:
        return list(dict.fromkeys(origins))
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def service_port(variable: str, default_url: str) -> int:
    """Read a service's listen port from its configured base URL."""
    value = os.getenv(variable, default_url)
    return urlsplit(value).port or urlsplit(default_url).port
