"""
backend/recommendation/classifier.py
--------------------------------------
Uses FashionCLIP to classify a clothing item from its image URL and/or title.

Primary path:
  image URL → PIL.Image → FashionCLIP zero-shot classification → attributes

Fallback (when image is unavailable or download fails):
  product title → keyword/regex parsing → approximate attributes

The returned dict always has these keys (values may be None if unknown):
  {
      "category": str | None,
      "color":    str | None,
      "style":    str | None,
      "pattern":  str | None,
      "gender":   str | None,   # "men" | "women" | "unisex" | None
      "confidence": float,      # 0.0 – 1.0 (FashionCLIP top-1 score or 0 for fallback)
      "source":   str,          # "fashionclip" | "title_fallback"
  }
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Candidate label lists for zero-shot classification
# ---------------------------------------------------------------------------

CATEGORY_CANDIDATES: list[str] = [
    "t-shirt", "shirt", "blouse", "top", "polo",
    "jacket", "blazer", "coat", "hoodie", "sweatshirt", "cardigan", "sweater",
    "jeans", "trousers", "pants", "shorts", "skirt", "leggings", "chinos", "joggers",
    "dress", "jumpsuit", "kurta", "ethnic wear", "saree",
    "sneakers", "shoes", "boots", "sandals", "heels", "loafers", "formal shoes",
    "bag", "handbag", "watch", "belt", "hat", "sunglasses", "accessories",
]

COLOR_CANDIDATES: list[str] = [
    "black", "white", "grey", "navy", "blue", "red", "green", "olive",
    "beige", "brown", "cream", "pink", "yellow", "orange", "purple",
    "camel", "maroon", "burgundy",
]

STYLE_CANDIDATES: list[str] = [
    "casual", "formal", "smart casual", "streetwear",
    "sporty", "ethnic", "party", "business casual", "minimalist",
]

PATTERN_CANDIDATES: list[str] = [
    "solid", "striped", "checked", "printed", "floral", "graphic",
]

# Minimum confidence threshold — below this we treat the result as unknown
_CONFIDENCE_THRESHOLD = 0.12


# ---------------------------------------------------------------------------
# Image download helper
# ---------------------------------------------------------------------------

def _download_image(url: str):
    """
    Download an image from `url` and return a PIL.Image (RGB).
    Returns None on any failure.
    """
    try:
        import requests
        from PIL import Image

        resp = requests.get(url, timeout=10, stream=True)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return img
    except Exception as exc:
        _logger.warning("[CLASSIFIER] Image download failed (%s): %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# FashionCLIP zero-shot classification
# ---------------------------------------------------------------------------

def _classify_candidates(
    image,
    candidates: list[str],
) -> tuple[str, float]:
    """
    Run FashionCLIP zero-shot classification on `image` with `candidates`.
    Returns (best_label, probability).
    Runs inside the dedicated FashionCLIP executor thread.
    """
    import torch
    from .model import get_model_and_processor

    model, processor, device = get_model_and_processor()

    inputs = processor(
        text=candidates,
        images=image,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77,
    ).to(device)

    with torch.inference_mode():
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)[0]

    best_idx = int(probs.argmax())
    return candidates[best_idx], float(probs[best_idx])


def _classify_all_attributes(image) -> dict:
    """
    Run all four FashionCLIP classification calls in sequence
    inside the dedicated executor thread. Returns a dict of results.
    This batches all calls into a single executor submission to
    avoid repeated thread-hop overhead.
    """
    cat,  cat_conf = _classify_candidates(image, CATEGORY_CANDIDATES)
    col,  _        = _classify_candidates(image, COLOR_CANDIDATES)
    sty,  _        = _classify_candidates(image, STYLE_CANDIDATES)
    pat,  _        = _classify_candidates(image, PATTERN_CANDIDATES)
    return {
        "category": cat if cat_conf >= _CONFIDENCE_THRESHOLD else None,
        "color":    col,
        "style":    sty,
        "pattern":  pat,
        "confidence": round(cat_conf, 4),
    }


# ---------------------------------------------------------------------------
# Title-based fallback parsing
# ---------------------------------------------------------------------------

_TITLE_CATEGORY_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bt.?shirt\b', re.I), "t-shirt"),
    (re.compile(r'\bjeans?\b', re.I), "jeans"),
    (re.compile(r'\btrousers?\b', re.I), "trousers"),
    (re.compile(r'\bshorts?\b', re.I), "shorts"),
    (re.compile(r'\bskirt\b', re.I), "skirt"),
    (re.compile(r'\bdress\b', re.I), "dress"),
    (re.compile(r'\bjacket\b', re.I), "jacket"),
    (re.compile(r'\bblazer\b', re.I), "blazer"),
    (re.compile(r'\bcoat\b', re.I), "coat"),
    (re.compile(r'\bhoodie\b', re.I), "hoodie"),
    (re.compile(r'\bsweatshirt\b', re.I), "sweatshirt"),
    (re.compile(r'\bsweater\b', re.I), "sweater"),
    (re.compile(r'\bcardigan\b', re.I), "cardigan"),
    (re.compile(r'\bkurta\b', re.I), "kurta"),
    (re.compile(r'\bsaree|sari\b', re.I), "saree"),
    (re.compile(r'\bsneakers?\b', re.I), "sneakers"),
    (re.compile(r'\bboots?\b', re.I), "boots"),
    (re.compile(r'\bsandals?\b', re.I), "sandals"),
    (re.compile(r'\bheels?\b', re.I), "heels"),
    (re.compile(r'\bloafers?\b', re.I), "loafers"),
    (re.compile(r'\bshoes?\b', re.I), "shoes"),
    (re.compile(r'\bbag\b|\bhandbag\b|\btote\b', re.I), "bag"),
    (re.compile(r'\bwatch\b', re.I), "watch"),
    (re.compile(r'\bbelt\b', re.I), "belt"),
    (re.compile(r'\bhat\b|\bcap\b', re.I), "hat"),
    (re.compile(r'\bshirt\b', re.I), "shirt"),
    (re.compile(r'\bblouse\b', re.I), "blouse"),
    (re.compile(r'\btop\b', re.I), "top"),
    (re.compile(r'\bpolo\b', re.I), "polo"),
    (re.compile(r'\bjumpsuit\b', re.I), "jumpsuit"),
    (re.compile(r'\bleggings?\b', re.I), "leggings"),
]

_TITLE_COLOR_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bblack\b', re.I), "black"),
    (re.compile(r'\bwhite\b', re.I), "white"),
    (re.compile(r'\bgrey|gray\b', re.I), "grey"),
    (re.compile(r'\bnavy\b', re.I), "navy"),
    (re.compile(r'\bblue\b', re.I), "blue"),
    (re.compile(r'\bred\b', re.I), "red"),
    (re.compile(r'\bgreen\b', re.I), "green"),
    (re.compile(r'\bolive\b', re.I), "olive"),
    (re.compile(r'\bbeige\b', re.I), "beige"),
    (re.compile(r'\bbrown\b', re.I), "brown"),
    (re.compile(r'\bcream\b', re.I), "cream"),
    (re.compile(r'\bpink\b', re.I), "pink"),
    (re.compile(r'\byellow\b', re.I), "yellow"),
    (re.compile(r'\borange\b', re.I), "orange"),
    (re.compile(r'\bpurple\b', re.I), "purple"),
    (re.compile(r'\bcamel\b', re.I), "camel"),
    (re.compile(r'\bmaroon\b', re.I), "maroon"),
    (re.compile(r'\bburgundy\b', re.I), "burgundy"),
    (re.compile(r'\bdenim\b', re.I), "blue"),
]

_GENDER_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bmen\'?s?\b|\bboy\'?s?\b|\bmasculine\b', re.I), "men"),
    (re.compile(r'\bwomen\'?s?\b|\bwom[ae]n\b|\blad(?:ies|y)\'?s?\b|\bgirls?\b|\bfeminine\b', re.I), "women"),
    (re.compile(r'\bunisex\b', re.I), "unisex"),
]


def _parse_title_attributes(title: str) -> dict[str, Any]:
    """Extract clothing attributes from a product title using regex."""
    attrs: dict[str, Any] = {
        "category": None,
        "color": None,
        "style": None,
        "pattern": None,
        "gender": None,
        "confidence": 0.0,
        "source": "title_fallback",
    }

    if not title:
        return attrs

    for pattern, label in _TITLE_CATEGORY_PATTERNS:
        if pattern.search(title):
            attrs["category"] = label
            attrs["confidence"] = 0.5   # moderate confidence for title match
            break

    for pattern, label in _TITLE_COLOR_PATTERNS:
        if pattern.search(title):
            attrs["color"] = label
            break

    for pattern, label in _GENDER_PATTERNS:
        if pattern.search(title):
            attrs["gender"] = label
            break

    # Style heuristics from title
    if re.search(r'\bformal\b|\boffice\b|\bbusiness\b', title, re.I):
        attrs["style"] = "formal"
    elif re.search(r'\bsporty\b|\bsport\b|\bgym\b|\bactive\b', title, re.I):
        attrs["style"] = "sporty"
    elif re.search(r'\bstreet\b|\burban\b', title, re.I):
        attrs["style"] = "streetwear"
    elif re.search(r'\bethnic\b|\bkurta\b|\btraditional\b', title, re.I):
        attrs["style"] = "ethnic"
    elif re.search(r'\bcasual\b', title, re.I):
        attrs["style"] = "casual"

    return attrs


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def classify_product(
    image_url: str | None,
    title: str | None = None,
) -> dict[str, Any]:
    """
    Classify a clothing item using FashionCLIP (primary) or title parsing (fallback).

    Parameters
    ----------
    image_url : URL of the product image (can be None)
    title     : Product title for fallback parsing

    Returns
    -------
    dict with keys: category, color, style, pattern, gender, confidence, source
    """
    # ------------------------------------------------------------------
    # Try FashionCLIP path
    # ------------------------------------------------------------------
    image = None
    if image_url:
        image = _download_image(image_url)

    if image is not None:
        try:
            from .model import get_model_and_processor, _run_in_executor
            # Verify model is available (triggers lazy load)
            get_model_and_processor()

            # Run ALL FashionCLIP classification in one executor call
            # (single dedicated thread — prevents uvicorn deadlock)
            _logger.info(
                "[CLASSIFIER] Running FashionCLIP inference in executor..."
            )
            clip_results = _run_in_executor(_classify_all_attributes, image)

            # Gender from title (FashionCLIP doesn't do gender classification)
            gender = None
            if title:
                title_attrs = _parse_title_attributes(title)
                gender = title_attrs.get("gender")

            result = {
                **clip_results,
                "gender": gender,
                "source": "fashionclip",
            }

            _logger.info(
                "[CLASSIFIER] FashionCLIP result: %s", result
            )
            return result

        except Exception as exc:
            _logger.warning(
                "[CLASSIFIER] FashionCLIP classification failed, "
                "falling back to title parsing. Error: %s", exc,
            )

    # ------------------------------------------------------------------
    # Title-based fallback
    # ------------------------------------------------------------------
    _logger.info("[CLASSIFIER] Using title-based fallback for: %r", title)
    return _parse_title_attributes(title or "")
