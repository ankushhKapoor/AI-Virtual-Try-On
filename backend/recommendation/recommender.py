"""
backend/recommendation/recommender.py
---------------------------------------
Core recommendation logic.

Given clothing attributes (from the classifier), this module:
  1. Determines which outfit slots to fill (using rules.py)
  2. Selects the best category for each slot
  3. Builds a natural-language search query for each slot
  4. Calls the EXISTING /search endpoint to get real Amazon products
  5. Returns structured recommendations

The existing /search endpoint (same FastAPI app) is called via an internal
HTTP request so all existing caching and Oxylabs integration is reused
automatically.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from .rules import (
    resolve_complements,
    resolve_slot_categories,
    resolve_compatible_colors,
    GENDER_QUERY_SUFFIX,
)

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Number of products to retrieve per outfit slot
PRODUCTS_PER_SLOT = 4

# Internal base URL for calling the existing /search endpoint
_BACKEND_BASE = "http://127.0.0.1:8000"

# Recommendation-level cache (in-process, avoids repeated attribute lookups)
# Key: ASIN; Value: full recommendation response dict
import threading
import time as _time

_rec_cache: dict[str, tuple[dict, float]] = {}
_rec_cache_lock = threading.Lock()
_REC_CACHE_TTL = 1800   # 30 minutes (same as search cache)


def _rec_cache_get(asin: str) -> dict | None:
    with _rec_cache_lock:
        entry = _rec_cache.get(asin)
        if entry is None:
            return None
        value, expires_at = entry
        if _time.monotonic() > expires_at:
            del _rec_cache[asin]
            return None
        return value


def _rec_cache_set(asin: str, value: dict) -> None:
    with _rec_cache_lock:
        _rec_cache[asin] = (value, _time.monotonic() + _REC_CACHE_TTL)


# ---------------------------------------------------------------------------
# Query building
# ---------------------------------------------------------------------------

def _build_query(
    slot: str,
    slot_category: str,
    color_hints: list[str],
    style: str | None,
    gender: str | None,
) -> str:
    """
    Build a natural-language Amazon search query for a recommendation slot.

    Example:
      slot_category="t-shirt", color_hints=["white","grey"], style="casual",
      gender="men"  →  "white casual men's t-shirt"
    """
    parts: list[str] = []

    # Color — use first compatible color
    if color_hints:
        parts.append(color_hints[0])

    # Style modifier (skip if it would make query weird)
    if style and style not in ("unknown", "minimalist"):
        parts.append(style)

    # Gender
    gender_str = GENDER_QUERY_SUFFIX.get(gender or "", "")
    if gender_str:
        parts.append(gender_str)

    # Category (always last)
    parts.append(slot_category)

    query = " ".join(parts)
    # Collapse multiple spaces
    query = re.sub(r"\s+", " ", query).strip()
    return query


# ---------------------------------------------------------------------------
# Internal: call existing /search endpoint
# ---------------------------------------------------------------------------

def _search_products(query: str, domain: str = "in") -> list[dict]:
    """
    Call the EXISTING GET /search endpoint and return the product list.
    Benefits from the existing server-side TTL cache automatically.
    """
    import requests as http

    url = f"{_BACKEND_BASE}/search"
    params = {"query": query, "domain": domain}

    try:
        resp = http.get(url, params=params, timeout=30)
        if not resp.ok:
            _logger.warning(
                "[RECOMMENDER] /search returned %d for query=%r",
                resp.status_code, query,
            )
            return []
        data = resp.json()
        products = data.get("products", [])
        _logger.info(
            "[RECOMMENDER] /search query=%r → %d products",
            query, len(products),
        )
        return products

    except Exception as exc:
        _logger.error(
            "[RECOMMENDER] /search call failed for query=%r: %s", query, exc,
        )
        return []


# ---------------------------------------------------------------------------
# Scoring: rank products by FashionCLIP similarity (optional, best-effort)
# ---------------------------------------------------------------------------

def _score_products(
    products: list[dict],
    slot_category: str,
    color_hints: list[str],
) -> list[dict]:
    """
    Optionally re-rank products using lightweight heuristic scoring.
    Falls back gracefully if model is unavailable.

    Scoring dimensions (all configurable weights below):
      - title keyword match for slot_category
      - title keyword match for any color hint
    """
    WEIGHT_CATEGORY = 0.6
    WEIGHT_COLOR    = 0.4

    def _score(p: dict) -> float:
        title = (p.get("title") or "").lower()
        score = 0.0

        # Category relevance
        if slot_category.lower() in title:
            score += WEIGHT_CATEGORY

        # Color relevance
        for c in color_hints:
            if c.lower() in title:
                score += WEIGHT_COLOR
                break

        return score

    return sorted(products, key=_score, reverse=True)


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def build_recommendations(
    attributes: dict[str, Any],
    source_product: dict[str, Any],
    domain: str = "in",
) -> list[dict[str, Any]]:
    """
    Build outfit slot recommendations from clothing attributes.

    Parameters
    ----------
    attributes     : Output from classifier.classify_product()
    source_product : The product the user selected (asin, title, image, …)
    domain         : Amazon domain (default "in")

    Returns
    -------
    List of recommendation dicts:
      [{ "slot", "category", "query", "products": [...] }, ...]
    """
    category  = attributes.get("category")
    color     = attributes.get("color")
    style     = attributes.get("style")
    gender    = attributes.get("gender")

    # Determine which slots to fill
    slots = resolve_complements(category)
    _logger.info(
        "[RECOMMENDER] source_category=%r → slots=%s",
        category, slots,
    )

    color_hints = resolve_compatible_colors(color)

    recommendations: list[dict] = []

    for slot in slots:
        # Choose the best category for this slot
        slot_cats = resolve_slot_categories(slot, style, category)
        slot_cat = slot_cats[0] if slot_cats else slot

        # Build search query
        query = _build_query(
            slot=slot,
            slot_category=slot_cat,
            color_hints=color_hints,
            style=style,
            gender=gender,
        )

        _logger.info(
            "[RECOMMENDER] slot=%r → category=%r → query=%r",
            slot, slot_cat, query,
        )

        # Fetch products (reuses existing /search + existing cache)
        try:
            products = _search_products(query, domain=domain)
            products = _score_products(products, slot_cat, color_hints)
            products = products[:PRODUCTS_PER_SLOT]
        except Exception as exc:
            _logger.warning(
                "[RECOMMENDER] Slot %r failed: %s — skipping", slot, exc
            )
            continue

        recommendations.append({
            "slot": slot,
            "category": slot_cat,
            "query": query,
            "products": products,
        })

    return recommendations
