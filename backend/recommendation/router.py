"""
backend/recommendation/router.py
----------------------------------
FastAPI APIRouter that exposes:

    POST /recommendations

This file contains ONLY the route definition and request/response models.
All business logic lives in classifier.py and recommender.py.

The router is registered in backend/main.py with a single include_router() call.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .classifier import classify_product
from .recommender import build_recommendations, _rec_cache_get, _rec_cache_set

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["recommendations"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ProductInput(BaseModel):
    """The selected product sent from the frontend."""
    asin:     str = Field(..., description="Amazon Standard Identification Number")
    title:    str | None = Field(None, description="Product title")
    image:    str | None = Field(None, description="Primary image URL")
    brand:    str | None = Field(None, description="Brand name")
    category: str | None = Field(None, description="Category label if available")
    gender:   str | None = Field(None, description="Gender hint if available")
    color:    str | None = Field(None, description="Color hint if available")
    domain:   str        = Field("in",  description="Amazon domain (e.g. 'in', 'com')")


class RecommendationRequest(BaseModel):
    product: ProductInput


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/recommendations")
def get_recommendations(
    body: RecommendationRequest,
) -> dict[str, Any]:
    """
    Return outfit recommendations for the selected product.

    Pipeline:
      1. Check in-process recommendation cache (ASIN-keyed, 30 min TTL)
      2. Classify the product via FashionCLIP (or title fallback)
      3. Determine outfit slots from compatibility rules
      4. For each slot: build a search query → call existing /search
         (which itself uses the server-side TTL cache + Oxylabs)
      5. Return structured recommendations

    If the model or any individual slot fails the other slots are still
    returned; the product page must never crash due to this endpoint.
    """
    product = body.product
    asin    = product.asin.strip().upper()

    # ------------------------------------------------------------------
    # 1. Recommendation cache hit?
    # ------------------------------------------------------------------
    cached = _rec_cache_get(asin)
    if cached is not None:
        _logger.info(
            "[RECOMMENDATIONS] Cache HIT for asin=%s", asin
        )
        return cached

    _logger.info(
        "[RECOMMENDATIONS] Cache MISS for asin=%s — running pipeline", asin
    )

    # ------------------------------------------------------------------
    # 2. Classify product attributes
    # Smart routing:
    #   - If category is already known from Amazon metadata → use title
    #     fallback (fast, < 1 sec) and skip FashionCLIP.
    #   - If category is unknown but we have an image → run FashionCLIP
    #     (slow, 20-40 sec on CPU).
    # This means ~90% of products get instant recommendations.
    # ------------------------------------------------------------------
    try:
        pre_known: dict[str, Any] = {}
        if product.category:
            pre_known["category"] = product.category.lower()
        if product.color:
            pre_known["color"] = product.color.lower()
        if product.gender:
            pre_known["gender"] = product.gender.lower()

        # Try fast title-based classification first
        from .classifier import _parse_title_attributes, classify_product
        title_attrs = _parse_title_attributes(product.title or "")

        # Determine if we need FashionCLIP:
        # Skip it when category is already reliably known (from metadata or title)
        category_known = (
            bool(pre_known.get("category"))      # Amazon metadata provided it
            or bool(title_attrs.get("category")) # Title regex found it
        )

        if category_known:
            # Fast path: use title attributes + merge metadata
            _logger.info(
                "[RECOMMENDATIONS] Fast path (no FashionCLIP) for asin=%s", asin
            )
            clip_attrs = title_attrs
        else:
            # Slow path: run FashionCLIP (only when category truly unknown)
            _logger.info(
                "[RECOMMENDATIONS] FashionCLIP path for asin=%s", asin
            )
            clip_attrs = classify_product(
                image_url=product.image,
                title=product.title,
            )

        # Merge: prefer Amazon metadata > title fallback > FashionCLIP
        attributes: dict[str, Any] = {**clip_attrs, **pre_known}

        _logger.info(
            "[RECOMMENDATIONS] Attributes for asin=%s: %s", asin, attributes
        )

    except Exception as exc:
        _logger.error(
            "[RECOMMENDATIONS] Classification failed for asin=%s: %s",
            asin, exc, exc_info=True,
        )
        # Use empty attributes — recommender will fall back to generic rules
        attributes = {
            "category": product.category,
            "color": product.color,
            "style": None,
            "pattern": None,
            "gender": product.gender,
            "confidence": 0.0,
            "source": "error_fallback",
        }

    # ------------------------------------------------------------------
    # 3 + 4. Build recommendations (calls existing /search internally)
    # ------------------------------------------------------------------
    try:
        recommendations = build_recommendations(
            attributes=attributes,
            source_product=product.model_dump(),
            domain=product.domain,
        )
    except Exception as exc:
        _logger.error(
            "[RECOMMENDATIONS] Recommender failed for asin=%s: %s",
            asin, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Recommendation engine error",
                "asin": asin,
            },
        )

    # ------------------------------------------------------------------
    # 5. Build response and cache it
    # ------------------------------------------------------------------
    response: dict[str, Any] = {
        "status": "success",
        "source_product": product.model_dump(),
        "attributes": {
            k: attributes.get(k)
            for k in ("category", "color", "style", "pattern", "gender", "confidence", "source")
        },
        "recommendations": recommendations,
    }

    _rec_cache_set(asin, response)
    _logger.info(
        "[RECOMMENDATIONS] Done for asin=%s — %d slots returned",
        asin, len(recommendations),
    )

    return response
