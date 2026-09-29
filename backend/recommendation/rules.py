"""
Recommendation rules.

This file defines:
- canonical clothing categories
- aliases
- outfit slots
- complements
- style preferences
- color compatibility
"""

from __future__ import annotations

import re


# ============================================================
# CATEGORY NORMALIZATION
# ============================================================

CATEGORY_ALIASES: dict[str, str] = {
    # Tops
    "tee": "t-shirt",
    "tees": "t-shirt",
    "tshirt": "t-shirt",
    "t shirts": "t-shirt",
    "t shirt": "t-shirt",
    "graphic tee": "t-shirt",

    "button down": "shirt",
    "button-down": "shirt",
    "button down shirt": "shirt",
    "formal shirt": "shirt",
    "casual shirt": "shirt",
    "dress shirt": "shirt",

    "crop top": "crop top",
    "tank": "tank top",
    "tanktop": "tank top",
    "camisole top": "camisole",

    # Indian / ethnic
    "kurti": "kurti",
    "kurtis": "kurti",
    "kurta": "kurta",

    "kurta set": "kurta set",
    "kurti set": "kurti set",
    "kurtis set": "kurti set",
    "salwar set": "salwar suit",
    "salwar kameez": "salwar suit",
    "salwar suit": "salwar suit",
    "suit set": "salwar suit",

    "lehenga set": "lehenga set",
    "lehenga choli": "lehenga set",
    "sharara set": "ethnic set",
    "gharara set": "ethnic set",
    "ethnic set": "ethnic set",

    "coord set": "co-ord set",
    "co ord set": "co-ord set",
    "co-ord set": "co-ord set",
    "coordinated set": "co-ord set",
    "two piece set": "co-ord set",
    "two-piece set": "co-ord set",
    "three piece set": "co-ord set",
    "three-piece set": "co-ord set",

    # Bottoms
    "denim": "jeans",
    "denim jeans": "jeans",

    "pant": "pants",
    "trouser": "trousers",

    "cargo pant": "cargo pants",
    "cargo pants": "cargo pants",

    "track pant": "track pants",
    "track pants": "track pants",

    "jogger": "joggers",

    "palazzo pant": "palazzo",
    "palazzo pants": "palazzo",

    "dhoti pant": "dhoti pants",
    "dhoti pants": "dhoti pants",

    # Outerwear
    "windbreaker": "jacket",
    "bomber": "jacket",
    "puffer": "jacket",

    "overcoat": "coat",

    # Footwear
    "running shoe": "running shoes",
    "running shoes": "running shoes",
    "sneaker": "sneakers",

    "loafer": "loafers",

    "boot": "boots",

    "flat": "flats",
    "flat shoes": "flats",

    "jutti": "juttis",
    "juttis": "juttis",
    "mojari": "mojaris",
    "mojaris": "mojaris",

    "formal shoe": "formal shoes",
    "formal shoes": "formal shoes",

    # Accessories
    "hand bag": "handbag",
    "purse": "handbag",
    "tote": "bag",
    "tote bag": "bag",

    "cap": "hat",
    "sun hat": "hat",

    "earrings": "earrings",
    "earring": "earrings",

    "necklace": "necklace",
    "bracelet": "bracelet",

    "scarf": "scarf",
    "dupatta": "dupatta",
}


def normalize_category(category: str | None) -> str | None:
    if not category:
        return None

    value = re.sub(
        r"\s+",
        " ",
        str(category).strip().lower(),
    )

    if not value:
        return None

    if value in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[value]

    # Important compound categories first.
    compound_patterns = [
        (r"\bkurta\s*set\b", "kurta set"),
        (r"\bkurti\s*set\b", "kurti set"),
        (r"\bsalwar\s*(suit|set|kameez)\b", "salwar suit"),
        (r"\blehenga\s*(set|choli)\b", "lehenga set"),
        (r"\b(sharara|gharara)\s*set\b", "ethnic set"),
        (r"\bco[- ]?ord(?:inated)?\s*set\b", "co-ord set"),
        (r"\b(two|three)[ -]?piece\s*set\b", "co-ord set"),
    ]

    for pattern, canonical in compound_patterns:
        if re.search(pattern, value, re.I):
            return canonical

    return value


# ============================================================
# FULL OUTFIT / SET CATEGORIES
# ============================================================

SET_CATEGORIES = {
    "kurta set",
    "kurti set",
    "salwar suit",
    "lehenga set",
    "ethnic set",
    "co-ord set",
}


FULL_BODY_CATEGORIES = {
    "dress",
    "gown",
    "shirt dress",
    "jumpsuit",
    "romper",
    "playsuit",
    "saree",
    "lehenga",
    "anarkali",
    "kaftan",
}


# ============================================================
# SOURCE CATEGORY -> RECOMMENDATION SLOTS
# ============================================================

CATEGORY_COMPLEMENTS: dict[str, list[str]] = {
    # ---------------- TOPS ----------------

    "t-shirt": [
        "bottom",
        "footwear",
    ],

    "shirt": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "blouse": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "crop top": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "tank top": [
        "bottom",
        "footwear",
    ],

    "camisole": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "tunic": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "polo": [
        "bottom",
        "footwear",
    ],

    "bodysuit": [
        "bottom",
        "footwear",
        "accessory",
    ],

    # ---------------- INDIAN / ETHNIC ----------------

    "kurta": [
        "bottom",
        "footwear",
        "accessory",
    ],

    "kurti": [
        "bottom",
        "footwear",
        "accessory",
    ],

    # A set already contains top + bottom.
    "kurta set": [
        "footwear",
        "accessory",
    ],

    "kurti set": [
        "footwear",
        "accessory",
    ],

    "salwar suit": [
        "footwear",
        "accessory",
    ],

    "lehenga set": [
        "footwear",
        "accessory",
    ],

    "ethnic set": [
        "footwear",
        "accessory",
    ],

    "saree": [
        "footwear",
        "accessory",
    ],

    "anarkali": [
        "footwear",
        "accessory",
    ],

    # ---------------- FULL BODY ----------------

    "dress": [
        "footwear",
        "accessory",
    ],

    "gown": [
        "footwear",
        "accessory",
    ],

    "shirt dress": [
        "footwear",
        "accessory",
    ],

    "jumpsuit": [
        "footwear",
        "accessory",
    ],

    "romper": [
        "footwear",
        "accessory",
    ],

    "playsuit": [
        "footwear",
        "accessory",
    ],

    "kaftan": [
        "footwear",
        "accessory",
    ],

    # ---------------- OUTERWEAR ----------------

    "jacket": [
        "top",
        "bottom",
        "footwear",
    ],

    "blazer": [
        "top",
        "bottom",
        "footwear",
    ],

    "coat": [
        "top",
        "bottom",
        "footwear",
    ],

    "cardigan": [
        "top",
        "bottom",
        "footwear",
    ],

    "hoodie": [
        "bottom",
        "footwear",
    ],

    "sweatshirt": [
        "bottom",
        "footwear",
    ],

    "sweater": [
        "bottom",
        "footwear",
    ],

    "vest": [
        "top",
        "bottom",
        "footwear",
    ],

    "shrug": [
        "top",
        "bottom",
        "footwear",
    ],

    # ---------------- BOTTOMS ----------------

    "jeans": [
        "top",
        "footwear",
    ],

    "trousers": [
        "top",
        "footwear",
    ],

    "pants": [
        "top",
        "footwear",
    ],

    "chinos": [
        "top",
        "footwear",
    ],

    "cargo pants": [
        "top",
        "footwear",
    ],

    "track pants": [
        "top",
        "footwear",
    ],

    "joggers": [
        "top",
        "footwear",
    ],

    "shorts": [
        "top",
        "footwear",
    ],

    "skirt": [
        "top",
        "footwear",
        "accessory",
    ],

    "leggings": [
        "top",
        "footwear",
    ],

    "palazzo": [
        "top",
        "footwear",
    ],

    "dhoti pants": [
        "top",
        "footwear",
    ],

    # ---------------- FOOTWEAR ----------------

    "sneakers": [
        "top",
        "bottom",
    ],

    "running shoes": [
        "top",
        "bottom",
    ],

    "shoes": [
        "top",
        "bottom",
    ],

    "formal shoes": [
        "top",
        "bottom",
    ],

    "loafers": [
        "top",
        "bottom",
    ],

    "boots": [
        "top",
        "bottom",
    ],

    "sandals": [
        "top",
        "bottom",
    ],

    "heels": [
        "top",
        "bottom",
    ],

    "flats": [
        "top",
        "bottom",
    ],

    "juttis": [
        "top",
        "bottom",
    ],

    "mojaris": [
        "top",
        "bottom",
    ],

    # ---------------- ACCESSORIES ----------------

    "bag": [
        "top",
        "bottom",
        "footwear",
    ],

    "handbag": [
        "top",
        "bottom",
        "footwear",
    ],

    "watch": [
        "top",
        "bottom",
    ],

    "belt": [
        "top",
        "bottom",
    ],

    "hat": [
        "top",
        "bottom",
    ],

    "sunglasses": [
        "top",
        "bottom",
    ],

    "earrings": [
        "top",
        "bottom",
        "footwear",
    ],

    "necklace": [
        "top",
        "bottom",
    ],

    "bracelet": [
        "top",
        "bottom",
    ],

    "scarf": [
        "top",
        "bottom",
    ],

    "dupatta": [
        "top",
        "bottom",
        "footwear",
    ],
}


# ============================================================
# SLOT -> SEARCHABLE CATEGORIES
# ============================================================

SLOT_CATEGORIES: dict[str, list[str]] = {
    "top": [
        "shirt",
        "t-shirt",
        "polo",
        "blouse",
        "crop top",
        "tank top",
        "tunic",
        "kurta",
        "kurti",
        "sweater",
        "sweatshirt",
        "hoodie",
    ],

    "bottom": [
        "jeans",
        "trousers",
        "chinos",
        "pants",
        "cargo pants",
        "joggers",
        "track pants",
        "shorts",
        "skirt",
        "leggings",
        "palazzo",
        "dhoti pants",
        "salwar",
    ],

    "footwear": [
        "sneakers",
        "running shoes",
        "loafers",
        "formal shoes",
        "shoes",
        "boots",
        "sandals",
        "heels",
        "flats",
        "juttis",
        "mojaris",
    ],

    "accessory": [
        "handbag",
        "bag",
        "watch",
        "belt",
        "sunglasses",
        "hat",
        "earrings",
        "necklace",
        "bracelet",
        "scarf",
        "dupatta",
    ],
}


# ============================================================
# STYLE PREFERENCES
# ============================================================

STYLE_SLOT_PREFERENCES: dict[str, dict[str, list[str]]] = {
    "casual": {
        "top": [
            "t-shirt",
            "shirt",
            "polo",
        ],
        "bottom": [
            "jeans",
            "chinos",
            "joggers",
            "shorts",
        ],
        "footwear": [
            "sneakers",
            "running shoes",
        ],
    },

    "smart casual": {
        "top": [
            "shirt",
            "polo",
        ],
        "bottom": [
            "chinos",
            "trousers",
            "jeans",
        ],
        "footwear": [
            "loafers",
            "sneakers",
        ],
    },

    "formal": {
        "top": [
            "shirt",
            "blouse",
        ],
        "bottom": [
            "trousers",
            "chinos",
        ],
        "footwear": [
            "formal shoes",
            "loafers",
            "heels",
        ],
    },

    "business casual": {
        "top": [
            "shirt",
            "blouse",
            "polo",
        ],
        "bottom": [
            "chinos",
            "trousers",
        ],
        "footwear": [
            "loafers",
            "formal shoes",
        ],
    },

    "streetwear": {
        "top": [
            "t-shirt",
            "hoodie",
            "sweatshirt",
        ],
        "bottom": [
            "cargo pants",
            "joggers",
            "jeans",
        ],
        "footwear": [
            "sneakers",
            "boots",
        ],
    },

    "sporty": {
        "top": [
            "t-shirt",
            "polo",
        ],
        "bottom": [
            "joggers",
            "track pants",
            "shorts",
            "leggings",
        ],
        "footwear": [
            "running shoes",
            "sneakers",
        ],
    },

    "ethnic": {
        "top": [
            "kurta",
            "kurti",
            "blouse",
        ],
        "bottom": [
            "palazzo",
            "salwar",
            "skirt",
        ],
        "footwear": [
            "juttis",
            "mojaris",
            "sandals",
        ],
        "accessory": [
            "handbag",
            "earrings",
            "necklace",
        ],
    },

    "party": {
        "top": [
            "blouse",
            "shirt",
            "crop top",
        ],
        "bottom": [
            "skirt",
            "trousers",
            "jeans",
        ],
        "footwear": [
            "heels",
            "boots",
            "loafers",
        ],
        "accessory": [
            "handbag",
            "earrings",
            "necklace",
        ],
    },
}


# ============================================================
# COLORS
# ============================================================

COLOR_COMPATIBILITY: dict[str, list[str]] = {
    "black": [
        "white",
        "grey",
        "beige",
        "blue",
        "olive",
        "cream",
    ],

    "white": [
        "black",
        "blue",
        "grey",
        "beige",
        "navy",
        "olive",
    ],

    "grey": [
        "white",
        "black",
        "navy",
        "blue",
        "burgundy",
    ],

    "navy": [
        "white",
        "beige",
        "grey",
        "light blue",
        "camel",
    ],

    "blue": [
        "white",
        "black",
        "grey",
        "beige",
        "brown",
    ],

    "olive": [
        "beige",
        "white",
        "black",
        "navy",
        "brown",
    ],

    "green": [
        "beige",
        "white",
        "brown",
        "navy",
        "black",
    ],

    "beige": [
        "white",
        "brown",
        "black",
        "navy",
        "olive",
    ],

    "brown": [
        "cream",
        "beige",
        "white",
        "navy",
        "olive",
    ],

    "cream": [
        "brown",
        "beige",
        "navy",
        "black",
        "camel",
    ],

    "red": [
        "black",
        "white",
        "navy",
        "grey",
        "beige",
    ],

    "maroon": [
        "white",
        "beige",
        "black",
        "grey",
    ],

    "burgundy": [
        "white",
        "grey",
        "beige",
        "black",
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
    ],

    "orange": [
        "white",
        "black",
        "navy",
        "beige",
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
    ],
}


DEFAULT_COMPATIBLE_COLORS = [
    "black",
    "white",
    "beige",
    "grey",
]


# ============================================================
# GENDER
# ============================================================

GENDER_QUERY_SUFFIX = {
    "men": "men's",
    "women": "women's",
    "unisex": "",
}


# ============================================================
# HELPERS
# ============================================================

def resolve_complements(
    category: str | None,
) -> list[str]:
    category = normalize_category(category)

    if not category:
        return [
            "top",
            "bottom",
            "footwear",
        ]

    if category in CATEGORY_COMPLEMENTS:
        return list(CATEGORY_COMPLEMENTS[category])

    # Unknown set-like products should not get another top/bottom.
    if category in SET_CATEGORIES:
        return [
            "footwear",
            "accessory",
        ]

    if category in FULL_BODY_CATEGORIES:
        return [
            "footwear",
            "accessory",
        ]

    return [
        "top",
        "bottom",
        "footwear",
    ]


def resolve_slot_categories(
    slot: str,
    style: str | None,
    source_category: str | None,
) -> list[str]:
    source_category = normalize_category(
        source_category
    )

    candidates: list[str] = []

    if style:
        style_key = style.strip().lower()

        style_candidates = (
            STYLE_SLOT_PREFERENCES
            .get(style_key, {})
            .get(slot, [])
        )

        candidates.extend(style_candidates)

    candidates.extend(
        SLOT_CATEGORIES.get(slot, [slot])
    )

    # Never recommend the exact same category as the source.
    if source_category:
        candidates = [
            category
            for category in candidates
            if normalize_category(category)
            != source_category
        ]

    # Preserve order while removing duplicates.
    result = []

    for category in candidates:
        if category not in result:
            result.append(category)

    return result or SLOT_CATEGORIES.get(
        slot,
        [slot],
    )


def resolve_compatible_colors(
    color: str | None,
) -> list[str]:
    if not color:
        return DEFAULT_COMPATIBLE_COLORS

    color = color.strip().lower()

    return COLOR_COMPATIBILITY.get(
        color,
        DEFAULT_COMPATIBLE_COLORS,
    )