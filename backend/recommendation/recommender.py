"""
backend/recommendation/recommender.py
---------------------------------------
Core recommendation logic.

Given clothing attributes (from the classifier), this module:
  1. Determines which outfit slots to fill (using rules.py)
  2. Selects the best category for each slot
  3. Builds a natural-language search query for each slot
  4. Calls the shared product-search service to get Amazon products
  5. Returns structured recommendations

The API route and recommendation service share the same search function,
including its existing cache and Oxylabs integration.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from .rules import (
    resolve_outfit_plan,
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


# Map each slot to which index in color_hints to use.
# This ensures top / bottom / footwear don't all get the same color.
_SLOT_COLOR_INDEX: dict[str, int] = {
    "top":       0,   # strongest contrast color
    "outerwear": 1,
    "bottom":    2,   # 3rd compatible color (e.g. blue jeans instead of white)
    "footwear":  0,   # white / first compatible is fine for shoes
    "accessory": 1,
}

# Styles too generic to improve a query (adding "casual" to every search is noise)
_STYLE_SKIP = {"casual", "minimalist", "unknown", None}

# Slot → short filler phrase to make queries more natural on Amazon
_SLOT_CONTEXT: dict[str, str] = {
    "top":       "",
    "bottom":    "",
    "footwear":  "",
    "outerwear": "",
    "accessory": "",
}

# Product title words accepted for each recommended item. Marketplace search
# can mix in the source garment even for a precise query, so this is a final
# category guard before results reach the UI.
_CATEGORY_TERMS: dict[str, tuple[str, ...]] = {
    "t-shirt": ("t-shirt", "tshirt", "tee"), "shirt": ("shirt",),
    "blouse": ("blouse",), "top": (" top",), "polo": ("polo",),
    "jeans": ("jean", "denim"), "trousers": ("trouser", "pant"),
    "pants": ("pant", "trouser"), "chinos": ("chino",), "shorts": ("short",),
    "skirt": ("skirt",), "joggers": ("jogger",), "leggings": ("legging",),
    "sneakers": ("sneaker",), "shoes": ("shoe",), "boots": ("boot",),
    "sandals": ("sandal", "slipper", "flat"), "heels": ("heel", "pump"),
    "loafers": ("loafer",), "formal shoes": ("formal shoe", "oxford", "derby"),
    "watch": ("watch",), "belt": ("belt",), "handbag": ("handbag", "purse", "tote"),
    "crossbody bag": ("crossbody", "sling bag", "shoulder bag"),
    "clutch purse": ("clutch", "purse"), "bangles": ("bangle",),
    "bracelet": ("bracelet",), "earrings": ("earring",), "ethnic sandals": ("sandal", "jutti", "kolhapuri"),
    "night slippers": ("slipper", "house slipper", "flip flop"),
    "college backpack": ("backpack", "college bag", "rucksack"),
    "office laptop bag": ("laptop bag", "office bag", "briefcase", "messenger bag"),
}


def _normalise_category(value: str | None) -> str:
    value = (value or "").lower().replace("-", " ")
    if "t shirt" in value or "tshirt" in value:
        return "t-shirt"
    if "sari" in value or "saree" in value:
        return "saree"
    for category, terms in _CATEGORY_TERMS.items():
        if category in value or any(term in value for term in terms):
            return category
    return value.strip()


def _filter_complementary_products(
    products: list[dict], source_product: dict[str, Any], slot_category: str,
) -> list[dict]:
    """Keep complementary products and always remove the selected garment."""
    source_asin = str(source_product.get("asin") or "").strip().upper()
    source_category = _normalise_category(source_product.get("category"))
    expected_terms = _CATEGORY_TERMS.get(_normalise_category(slot_category), ())
    filtered: list[dict] = []
    seen: set[str] = set()
    for product in products:
        asin = str(product.get("asin") or product.get("id") or "").strip().upper()
        title = str(product.get("title") or product.get("name") or "").lower()
        product_category = _normalise_category(product.get("category") or title)
        if not asin or asin == source_asin or asin in seen:
            continue
        if source_category and product_category == source_category:
            continue
        if expected_terms and title and not any(term in title for term in expected_terms):
            continue
        seen.add(asin)
        filtered.append(product)
    return filtered


def _build_query(
    slot: str,
    slot_category: str,
    color_hints: list[str],
    style: str | None,
    gender: str | None,
    source_category: str | None = None,
) -> str:
    """
    Build a varied, meaningful Amazon search query for a recommendation slot.

    Key improvements over v1:
    - Different color per slot (not always color_hints[0] = "white")
    - Style only added when distinctive (formal, streetwear, ethnic, sporty)
    - Gender suffix when available
    - Source category appended for context on niche slots (footwear, accessories)

    Examples:
      black jacket, slot=top       → "white t-shirt"
      black jacket, slot=bottom    → "blue jeans"          (color_hints[2])
      black jacket, slot=footwear  → "white sneakers"
      navy blazer,  slot=top       → "formal men's shirt"
      red dress,    slot=footwear  → "black heels"
    """
    parts: list[str] = []

    # --- Color: use slot-specific index so slots get different colors ---
    if color_hints:
        idx = _SLOT_COLOR_INDEX.get(slot, 0)
        color = color_hints[min(idx, len(color_hints) - 1)]
        parts.append(color)

    # --- Style: only when distinctive (skip casual, minimalist) ---
    if style and style not in _STYLE_SKIP:
        parts.append(style)

    # --- Gender suffix ---
    gender_str = GENDER_QUERY_SUFFIX.get(gender or "", "")
    if gender_str:
        parts.append(gender_str)

    # --- Category ---
    parts.append(slot_category)

    query = re.sub(r"\s+", " ", " ".join(parts)).strip()
    return query


# ---------------------------------------------------------------------------
# Internal: use the shared product-search service
# ---------------------------------------------------------------------------

def _search_products(query: str, domain: str = "in") -> list[dict]:
    try:
        import sys

        # Uvicorn may load this app as either backend.main or main. Reuse the
        # loaded module so recommendations share the API's search cache.
        app_module = sys.modules.get("backend.main") or sys.modules.get("main")
        if app_module is None:
            from backend import main as app_module

        data = app_module.search_products_data(query, domain, "")
        products = data.get("products", [])
        _logger.info(
            "[RECOMMENDER] shared search query=%r → %d products",
            query, len(products),
        )
        return products

    except Exception as exc:
        _logger.error(
            "[RECOMMENDER] shared search failed for query=%r: %s", query, exc,
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

    # Last-line protection against broad catalog labels. This also covers any
    # internal caller that bypasses the API router: a specific garment in the
    # product title always wins over labels such as "Kids Clothing".
    title_attributes: dict[str, Any] = {}
    try:
        from .classifier import _parse_title_attributes
        title_attributes = _parse_title_attributes(source_product.get("title") or "")
        category = title_attributes.get("category") or category
        style = style or title_attributes.get("style")
        gender = gender or title_attributes.get("gender")
    except Exception:
        pass

    # Use curated plans where styling details matter, then generic complements.
    slots, profile = resolve_outfit_plan(category, style, gender)
    _logger.info(
        "[RECOMMENDER] source_category=%r → slots=%s",
        category, slots,
    )

    color_hints = resolve_compatible_colors(color)
    # Catalog metadata is occasionally absent. Preserve the detected category
    # for the post-search exclusion check in that case.
    source_context = {
        **source_product,
        "category": title_attributes.get("category") or source_product.get("category") or category,
    }

    recommendations: list[dict] = []

    for slot in slots:
        # Choose the best category for this slot
        slot_cats = profile.get(slot) or resolve_slot_categories(slot, style, category)
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

        # Fetch products through the shared search service and its cache.
        try:
            products = _search_products(query, domain=domain)
            products = _filter_complementary_products(products, source_context, slot_cat)
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
