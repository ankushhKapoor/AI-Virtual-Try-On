from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from .classifier import classify_product
from .recommender import build_recommendations


# ---------------------------------------------------------------------------
# FastAPI Recommendation Router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


# ---------------------------------------------------------------------------
# Attribute Helpers
# ---------------------------------------------------------------------------

def _merge_attributes(
    product: Dict[str, Any],
    classified: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge product metadata with classifier output.

    Explicit product metadata takes priority when available.
    """

    merged = dict(classified or {})

    for key in (
        "category",
        "color",
        "gender",
        "style",
        "occasion",
        "formality",
        "material",
    ):
        value = product.get(key)

        if value:
            merged[key] = value

    if product.get("title"):
        merged["title"] = product["title"]

    if product.get("image"):
        merged["image"] = product["image"]

    if product.get("image_url"):
        merged["image_url"] = product["image_url"]

    if product.get("thumbnail"):
        merged["thumbnail"] = product["thumbnail"]

    return merged


# ---------------------------------------------------------------------------
# Request Payload Helper
# ---------------------------------------------------------------------------

def _unwrap_product_payload(
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Accept both of these request formats:

    1. Direct product object:

        {
            "asin": "...",
            "title": "...",
            "image": "..."
        }

    2. Wrapped product object:

        {
            "product": {
                "asin": "...",
                "title": "...",
                "image": "..."
            }
        }

    Supporting both keeps the API backward-compatible with
    the existing frontend.
    """

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=400,
            detail="Request body must be a JSON object.",
        )

    wrapped_product = payload.get("product")

    if isinstance(wrapped_product, dict):
        return wrapped_product

    return payload


# ---------------------------------------------------------------------------
# Recommendation Logic
# ---------------------------------------------------------------------------

def get_recommendations(
    product: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Classify the selected product and generate complementary
    outfit recommendations.
    """

    if not isinstance(product, dict):
        raise HTTPException(
            status_code=400,
            detail="Product must be a JSON object.",
        )

    image_url = (
        product.get("image")
        or product.get("image_url")
        or product.get("thumbnail")
    )

    # ---------------------------------------------------------------
    # FashionCLIP classification
    # ---------------------------------------------------------------

    classified = classify_product(
        image_url=image_url,
        title=product.get("title", ""),
    )

    # ---------------------------------------------------------------
    # Merge classifier output with explicit product metadata
    # ---------------------------------------------------------------

    attributes = _merge_attributes(
        product,
        classified,
    )

    # ---------------------------------------------------------------
    # Generate recommendations
    # ---------------------------------------------------------------

    domain = (
        product.get("domain")
        or product.get("amazon_domain")
        or "in"
    )

    recommendations = build_recommendations(
        attributes=attributes,
        source_product=product,
        domain=domain,
    )

    return {
        "product": product,
        "attributes": attributes,
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# API Endpoint
# ---------------------------------------------------------------------------

@router.post("")
def recommendation_endpoint(
    payload: Dict[str, Any],
):
    """
    Generate outfit recommendations for a product.

    Both direct and wrapped request formats are supported.
    """

    product = _unwrap_product_payload(
        payload
    )

    if not product:
        raise HTTPException(
            status_code=400,
            detail="Product data is required.",
        )

    try:

        return get_recommendations(
            product
        )

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Recommendation generation failed: "
                f"{str(exc)}"
            ),
        )