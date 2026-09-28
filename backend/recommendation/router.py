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

    Explicit product metadata is preferred when available.
    """

    merged = dict(classified or {})

    # Product-level metadata takes priority when present.
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

    # Keep title available for downstream recommendation logic.
    if product.get("title"):
        merged["title"] = product["title"]

    # Keep image information available.
    if product.get("image"):
        merged["image"] = product["image"]

    if product.get("image_url"):
        merged["image_url"] = product["image_url"]

    if product.get("thumbnail"):
        merged["thumbnail"] = product["thumbnail"]

    return merged


# ---------------------------------------------------------------------------
# Recommendation Logic
# ---------------------------------------------------------------------------

def get_recommendations(
    product: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Classify the input product and generate outfit recommendations.
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

    # Run classifier using the image when available.
    classified = classify_product(
        image_url=image_url,
        title=product.get("title", ""),
    )

    # Combine classifier output with product metadata.
    attributes = _merge_attributes(
        product,
        classified,
    )

    # Generate recommendations.
    #
    # Keep the call compatible with the current recommender
    # implementation.
    recommendations = build_recommendations(
        attributes=attributes,
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
    product: Dict[str, Any],
):
    """
    Generate outfit recommendations for a product.

    Request body can be the product object directly, for example:

    {
        "asin": "B0XXXXXXX",
        "title": "Women's Black Top",
        "image": "https://..."
    }
    """

    if not product:
        raise HTTPException(
            status_code=400,
            detail="Product data is required.",
        )

    try:
        return get_recommendations(product)

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation generation failed: {str(exc)}",
        )