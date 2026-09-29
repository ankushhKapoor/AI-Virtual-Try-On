"""
backend/recommendation/rules.py

Fashion compatibility rules.

This module is deliberately rule-driven and explainable.

The recommender combines these rules with FashionCLIP semantic scoring.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Category -> complementary outfit slots
# ---------------------------------------------------------------------------

CATEGORY_COMPLEMENTS: dict[str, list[str]] = {

    # Tops
    "t-shirt": ["bottom", "footwear", "accessory"],
    "shirt": ["bottom", "footwear", "accessory"],
    "blouse": ["bottom", "footwear", "accessory"],
    "top": ["bottom", "footwear", "accessory"],
    "polo": ["bottom", "footwear"],

    # Outerwear
    "jacket": ["top", "bottom", "footwear"],
    "blazer": ["top", "bottom", "footwear"],
    "coat": ["top", "bottom", "footwear"],
    "hoodie": ["bottom", "footwear"],
    "sweatshirt": ["bottom", "footwear"],
    "cardigan": ["top", "bottom", "footwear"],
    "sweater": ["bottom", "footwear"],

    # Bottoms
    "jeans": ["top", "footwear", "accessory"],
    "trousers": ["top", "footwear", "accessory"],
    "pants": ["top", "footwear", "accessory"],
    "shorts": ["top", "footwear"],
    "skirt": ["top", "footwear", "accessory"],
    "leggings": ["top", "footwear"],
    "chinos": ["top", "footwear"],
    "joggers": ["top", "footwear"],

    # Full body
    "dress": ["footwear", "accessory"],
    "jumpsuit": ["footwear", "accessory"],
    "kurta": ["bottom", "footwear", "accessory"],
    "ethnic wear": ["footwear", "accessory"],
    "saree": ["footwear", "accessory"],

    # Footwear
    "sneakers": ["top", "bottom", "accessory"],
    "shoes": ["top", "bottom", "accessory"],
    "boots": ["top", "bottom", "accessory"],
    "sandals": ["top", "bottom", "accessory"],
    "heels": ["top", "bottom", "accessory"],
    "loafers": ["top", "bottom", "accessory"],
    "formal shoes": ["top", "bottom", "accessory"],

    # Accessories
    "bag": ["top", "bottom", "footwear"],
    "handbag": ["top", "bottom", "footwear"],
    "watch": ["top", "bottom", "footwear"],
    "belt": ["top", "bottom", "footwear"],
    "hat": ["top", "bottom", "footwear"],
    "sunglasses": ["top", "bottom", "footwear"],
    "accessories": ["top", "bottom", "footwear"],
}


# ---------------------------------------------------------------------------
# Slot -> candidate categories
# ---------------------------------------------------------------------------

SLOT_CATEGORIES: dict[str, list[str]] = {

    "top": [
        "shirt",
        "blouse",
        "t-shirt",
        "polo",
        "top",
        "sweater",
    ],

    "bottom": [
        "trousers",
        "jeans",
        "chinos",
        "skirt",
        "shorts",
        "joggers",
    ],

    "footwear": [
        "loafers",
        "formal shoes",
        "heels",
        "sneakers",
        "boots",
        "sandals",
    ],

    "accessory": [
        "handbag",
        "bag",
        "watch",
        "belt",
        "sunglasses",
    ],

    "outerwear": [
        "blazer",
        "jacket",
        "coat",
        "cardigan",
        "hoodie",
    ],
}


# ---------------------------------------------------------------------------
# Style preferences
# ---------------------------------------------------------------------------

STYLE_SLOT_PREFERENCES: dict[str, dict[str, list[str]]] = {

    "casual": {
        "top": ["t-shirt", "polo", "sweater"],
        "bottom": ["jeans", "chinos", "shorts"],
        "footwear": ["sneakers", "sandals"],
        "accessory": ["crossbody bag", "bag", "sunglasses"],
    },

    "formal": {
        "top": ["shirt", "blouse"],
        "bottom": ["trousers", "chinos"],
        "footwear": ["formal shoes", "loafers", "heels"],
        "accessory": ["watch", "handbag", "belt"],
        "outerwear": ["blazer", "coat"],
    },

    "business casual": {
        "top": ["shirt", "blouse", "polo"],
        "bottom": ["trousers", "chinos", "dark jeans"],
        "footwear": ["loafers", "formal shoes", "heels"],
        "accessory": ["watch", "belt", "handbag"],
        "outerwear": ["blazer"],
    },

    "smart casual": {
        "top": ["shirt", "polo", "blouse"],
        "bottom": ["chinos", "trousers", "dark jeans"],
        "footwear": ["loafers", "clean sneakers", "heels"],
        "accessory": ["watch", "belt", "crossbody bag"],
    },

    "streetwear": {
        "top": ["oversized t-shirt", "hoodie", "sweatshirt"],
        "bottom": ["baggy jeans", "cargo pants", "joggers"],
        "footwear": ["sneakers", "boots"],
        "accessory": ["cap", "crossbody bag", "sunglasses"],
    },

    "sporty": {
        "top": ["t-shirt", "sports top", "sweatshirt"],
        "bottom": ["joggers", "leggings", "sports shorts"],
        "footwear": ["running shoes", "sneakers"],
        "accessory": ["sports bag", "cap"],
    },

    "ethnic": {
        "top": ["kurta", "blouse"],
        "bottom": ["ethnic trousers", "palazzo", "skirt"],
        "footwear": ["sandals", "ethnic footwear"],
        "accessory": ["ethnic handbag", "traditional jewelry"],
    },

    "party": {
        "top": ["blouse", "dressy top", "shirt"],
        "bottom": ["skirt", "dress trousers", "dark jeans"],
        "footwear": ["heels", "dressy sandals", "ankle boots"],
        "accessory": ["clutch", "handbag", "statement jewelry"],
    },

    "elegant": {
        "top": ["blouse", "dressy top"],
        "bottom": ["tailored trousers", "skirt"],
        "footwear": ["heels", "elegant flats", "loafers"],
        "accessory": ["clutch", "handbag", "minimal jewelry"],
    },

    "minimalist": {
        "top": ["t-shirt", "shirt", "minimal blouse"],
        "bottom": ["trousers", "straight jeans", "chinos"],
        "footwear": ["clean sneakers", "loafers"],
        "accessory": ["minimal handbag", "watch"],
    },
}


# ---------------------------------------------------------------------------
# Occasion preferences
# ---------------------------------------------------------------------------

OCCASION_SLOT_PREFERENCES: dict[str, dict[str, list[str]]] = {

    "business formal": {
        "top": ["shirt", "blouse"],
        "bottom": ["tailored trousers"],
        "footwear": ["formal shoes", "loafers", "heels"],
        "accessory": ["watch", "structured handbag", "belt"],
    },

    "office workwear": {
        "top": ["shirt", "blouse"],
        "bottom": ["trousers", "chinos"],
        "footwear": ["loafers", "formal shoes", "heels"],
        "accessory": ["watch", "handbag", "belt"],
    },

    "party evening wear": {
        "footwear": ["heels", "dressy sandals", "elegant flats"],
        "accessory": ["clutch", "evening bag", "statement jewelry"],
        "outerwear": ["blazer", "elegant coat"],
    },

    "wedding occasion wear": {
        "footwear": ["heels", "dressy sandals", "elegant footwear"],
        "accessory": ["clutch", "statement jewelry", "elegant handbag"],
    },

    "vacation resort wear": {
        "top": ["linen shirt", "lightweight blouse", "t-shirt"],
        "bottom": ["linen trousers", "shorts", "skirt"],
        "footwear": ["sandals", "espadrilles"],
        "accessory": ["sunglasses", "crossbody bag", "straw bag"],
    },

    "summer wear": {
        "top": ["t-shirt", "linen shirt", "lightweight blouse"],
        "bottom": ["shorts", "skirt", "light trousers"],
        "footwear": ["sandals", "sneakers"],
        "accessory": ["sunglasses", "crossbody bag"],
    },

    "sports gym wear": {
        "top": ["sports top", "t-shirt"],
        "bottom": ["joggers", "leggings", "sports shorts"],
        "footwear": ["running shoes", "training shoes"],
        "accessory": ["sports bag", "cap"],
    },

    "traditional ethnic wear": {
        "footwear": ["ethnic sandals", "traditional footwear"],
        "accessory": ["traditional jewelry", "ethnic handbag"],
    },

    "streetwear": {
        "top": ["oversized t-shirt", "hoodie"],
        "bottom": ["baggy jeans", "cargo pants", "joggers"],
        "footwear": ["sneakers", "boots"],
        "accessory": ["cap", "crossbody bag", "sunglasses"],
    },

    "casual everyday wear": {
        "footwear": ["sneakers", "casual sandals", "loafers"],
        "accessory": ["crossbody bag", "watch", "sunglasses"],
    },

    "date night wear": {
        "footwear": ["heels", "loafers", "dressy sandals"],
        "accessory": ["clutch", "handbag", "minimal jewelry"],
    },
}


# ---------------------------------------------------------------------------
# Color compatibility
# ---------------------------------------------------------------------------

COLOR_COMPATIBILITY: dict[str, list[str]] = {

    "black": [
        "white",
        "cream",
        "beige",
        "grey",
        "camel",
        "burgundy",
        "olive",
        "silver",
    ],

    "white": [
        "black",
        "navy",
        "blue",
        "grey",
        "beige",
        "brown",
        "olive",
        "camel",
    ],

    "grey": [
        "white",
        "black",
        "navy",
        "blue",
        "burgundy",
        "pink",
        "cream",
    ],

    "navy": [
        "white",
        "beige",
        "grey",
        "cream",
        "camel",
        "brown",
    ],

    "blue": [
        "white",
        "black",
        "grey",
        "beige",
        "brown",
        "cream",
    ],

    "red": [
        "black",
        "white",
        "navy",
        "grey",
        "beige",
    ],

    "green": [
        "white",
        "beige",
        "brown",
        "navy",
        "black",
        "cream",
    ],

    "olive": [
        "white",
        "beige",
        "brown",
        "black",
        "navy",
        "cream",
    ],

    "beige": [
        "white",
        "brown",
        "black",
        "navy",
        "olive",
        "camel",
        "burgundy",
    ],

    "brown": [
        "white",
        "cream",
        "beige",
        "navy",
        "olive",
        "black",
        "camel",
    ],

    "cream": [
        "brown",
        "beige",
        "navy",
        "black",
        "camel",
        "olive",
    ],

    "pink": [
        "white",
        "grey",
        "black",
        "navy",
        "beige",
    ],

    "yellow": [
        "white",
        "black",
        "navy",
        "grey",
        "beige",
    ],

    "orange": [
        "white",
        "black",
        "navy",
        "beige",
        "brown",
    ],

    "purple": [
        "white",
        "grey",
        "black",
        "beige",
    ],

    "camel": [
        "white",
        "navy",
        "beige",
        "black",
        "cream",
        "brown",
    ],

    "maroon": [
        "white",
        "beige",
        "black",
        "grey",
        "cream",
    ],

    "burgundy": [
        "white",
        "grey",
        "beige",
        "black",
        "cream",
        "navy",
    ],
}


DEFAULT_COMPATIBLE_COLORS = [
    "black",
    "white",
    "beige",
    "grey",
]


GENDER_QUERY_SUFFIX = {
    "men": "men's",
    "women": "women's",
    "unisex": "",
    "unknown": "",
    "": "",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_slot_categories(
    slot: str,
    style: str | None,
    base_category: str | None,
    occasion: str | None = None,
) -> list[str]:

    # Occasion has highest priority for context-sensitive slots.
    if occasion:
        occasion_cats = OCCASION_SLOT_PREFERENCES.get(
            occasion,
            {},
        ).get(slot)

        if occasion_cats:
            return occasion_cats

    # Then style.
    if style:
        style_cats = STYLE_SLOT_PREFERENCES.get(
            style,
            {},
        ).get(slot)

        if style_cats:
            return style_cats

    return SLOT_CATEGORIES.get(
        slot,
        [slot],
    )


def resolve_compatible_colors(
    color: str | None,
) -> list[str]:

    if not color:
        return DEFAULT_COMPATIBLE_COLORS

    normalized = color.strip().lower()

    return COLOR_COMPATIBILITY.get(
        normalized,
        DEFAULT_COMPATIBLE_COLORS,
    )


def resolve_complements(
    category: str | None,
) -> list[str]:

    if not category:
        return [
            "top",
            "bottom",
            "footwear",
        ]

    normalized = category.strip().lower()

    if normalized in CATEGORY_COMPLEMENTS:
        return CATEGORY_COMPLEMENTS[normalized]

    for key, slots in CATEGORY_COMPLEMENTS.items():
        if key in normalized:
            return slots

    return [
        "top",
        "bottom",
        "footwear",
    ]