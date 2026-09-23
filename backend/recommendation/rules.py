"""
backend/recommendation/rules.py
--------------------------------
Outfit compatibility rules — single source of truth.

All mappings live here. To extend:
  - Add new keys to CATEGORY_COMPLEMENTS
  - Add new entries to SLOT_CATEGORIES
  - Add new color entries to COLOR_COMPATIBILITY
  - Add new style entries to STYLE_CATEGORY_HINTS

No if/else trees — just dict lookups.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Category → which outfit slots are recommended
# ---------------------------------------------------------------------------
# Each key is a FashionCLIP category label.
# Each value is an ordered list of slot names to fill.

CATEGORY_COMPLEMENTS: dict[str, list[str]] = {
    # Tops
    "t-shirt":      ["bottom", "footwear"],
    "shirt":        ["bottom", "footwear"],
    "blouse":       ["bottom", "footwear", "accessory"],
    "top":          ["bottom", "footwear"],
    "polo":         ["bottom", "footwear"],

    # Outerwear
    "jacket":       ["top", "bottom", "footwear"],
    "blazer":       ["top", "bottom", "footwear"],
    "coat":         ["top", "bottom", "footwear"],
    "hoodie":       ["bottom", "footwear"],
    "sweatshirt":   ["bottom", "footwear"],
    "cardigan":     ["top", "bottom", "footwear"],
    "sweater":      ["bottom", "footwear"],

    # Bottoms
    "jeans":        ["top", "footwear"],
    "trousers":     ["top", "footwear"],
    "pants":        ["top", "footwear"],
    "shorts":       ["top", "footwear"],
    "skirt":        ["top", "footwear", "accessory"],
    "leggings":     ["top", "footwear"],
    "chinos":       ["top", "footwear"],
    "joggers":      ["top", "footwear"],

    # Full-body
    "dress":        ["footwear", "accessory"],
    "jumpsuit":     ["footwear", "accessory"],
    "kurta":        ["bottom", "footwear"],
    "ethnic wear":  ["footwear", "accessory"],
    "saree":        ["footwear", "accessory"],

    # Footwear — recommend a full outfit
    "sneakers":     ["top", "bottom"],
    "shoes":        ["top", "bottom"],
    "boots":        ["top", "bottom"],
    "sandals":      ["top", "bottom"],
    "heels":        ["top", "bottom"],
    "loafers":      ["top", "bottom"],
    "formal shoes": ["top", "bottom"],

    # Accessories
    "bag":          ["top", "bottom", "footwear"],
    "handbag":      ["top", "bottom", "footwear"],
    "watch":        ["top", "bottom"],
    "belt":         ["top", "bottom"],
    "hat":          ["top", "bottom"],
    "sunglasses":   ["top", "bottom"],
    "accessories":  ["top", "bottom", "footwear"],
}

# ---------------------------------------------------------------------------
# Slot → candidate category labels (first is the default / most likely)
# ---------------------------------------------------------------------------

SLOT_CATEGORIES: dict[str, list[str]] = {
    "top":       ["t-shirt", "shirt", "blouse", "top", "polo", "sweatshirt"],
    "bottom":    ["jeans", "trousers", "chinos", "shorts", "skirt", "joggers"],
    "footwear":  ["sneakers", "shoes", "boots", "sandals", "loafers", "heels"],
    "accessory": ["bag", "handbag", "watch", "belt", "sunglasses"],
    "outerwear": ["jacket", "blazer", "coat", "cardigan", "hoodie"],
}

# ---------------------------------------------------------------------------
# Style → preferred categories per slot
# ---------------------------------------------------------------------------

STYLE_SLOT_PREFERENCES: dict[str, dict[str, list[str]]] = {
    "casual": {
        "top":      ["t-shirt", "polo", "sweatshirt"],
        "bottom":   ["jeans", "chinos", "shorts", "joggers"],
        "footwear": ["sneakers", "sandals"],
    },
    "formal": {
        "top":      ["shirt", "blouse"],
        "bottom":   ["trousers", "chinos"],
        "footwear": ["formal shoes", "loafers", "heels"],
        "outerwear": ["blazer", "coat"],
    },
    "smart casual": {
        "top":      ["shirt", "polo", "blouse"],
        "bottom":   ["chinos", "trousers", "dark jeans"],
        "footwear": ["loafers", "sneakers", "heels"],
    },
    "streetwear": {
        "top":      ["t-shirt", "hoodie", "sweatshirt"],
        "bottom":   ["jeans", "joggers", "shorts"],
        "footwear": ["sneakers", "boots"],
    },
    "sporty": {
        "top":      ["t-shirt", "polo", "sweatshirt"],
        "bottom":   ["shorts", "joggers", "leggings"],
        "footwear": ["sneakers"],
    },
    "ethnic": {
        "top":      ["kurta", "blouse"],
        "bottom":   ["trousers", "jeans", "skirt"],
        "footwear": ["sandals", "shoes"],
    },
    "party": {
        "top":      ["top", "blouse", "shirt"],
        "bottom":   ["jeans", "skirt", "trousers"],
        "footwear": ["heels", "boots", "sneakers"],
        "accessory": ["bag", "handbag"],
    },
    "business casual": {
        "top":      ["shirt", "blouse", "polo"],
        "bottom":   ["chinos", "trousers"],
        "footwear": ["loafers", "formal shoes", "heels"],
        "outerwear": ["blazer"],
    },
    "minimalist": {
        "top":      ["t-shirt", "shirt", "top"],
        "bottom":   ["trousers", "jeans", "chinos"],
        "footwear": ["sneakers", "loafers"],
    },
}

# ---------------------------------------------------------------------------
# Color compatibility — what colors pair well with each detected color
# ---------------------------------------------------------------------------

COLOR_COMPATIBILITY: dict[str, list[str]] = {
    "black":   ["white", "grey", "beige", "blue", "red", "olive", "cream"],
    "white":   ["black", "blue", "grey", "beige", "brown", "navy", "olive"],
    "grey":    ["white", "black", "navy", "blue", "burgundy", "pink"],
    "navy":    ["white", "beige", "grey", "light blue", "camel"],
    "blue":    ["white", "black", "grey", "beige", "brown"],
    "red":     ["white", "black", "navy", "grey", "beige"],
    "green":   ["white", "beige", "brown", "navy", "black"],
    "olive":   ["white", "beige", "brown", "black", "navy"],
    "beige":   ["white", "brown", "black", "navy", "olive", "camel"],
    "brown":   ["white", "beige", "cream", "navy", "olive"],
    "cream":   ["brown", "beige", "navy", "black", "camel"],
    "pink":    ["white", "grey", "black", "navy", "beige"],
    "yellow":  ["white", "black", "navy", "grey"],
    "orange":  ["white", "black", "navy", "beige"],
    "purple":  ["white", "grey", "black", "beige"],
    "camel":   ["white", "navy", "beige", "black", "cream"],
    "maroon":  ["white", "beige", "black", "grey"],
    "burgundy": ["white", "grey", "beige", "black"],
}

# Neutral fallback when color is not detected
DEFAULT_COMPATIBLE_COLORS = ["white", "black", "grey", "beige"]

# ---------------------------------------------------------------------------
# Gender keyword hints for query building
# ---------------------------------------------------------------------------

GENDER_QUERY_SUFFIX: dict[str, str] = {
    "men":     "men's",
    "women":   "women's",
    "unisex":  "",
    "unknown": "",
    "":        "",
}

# ---------------------------------------------------------------------------
# Helper: resolve which categories to use for a given slot, style, and base category
# ---------------------------------------------------------------------------

def resolve_slot_categories(
    slot: str,
    style: str | None,
    base_category: str | None,
) -> list[str]:
    """
    Return an ordered list of category preferences for a slot,
    using style preferences where available, falling back to
    the generic SLOT_CATEGORIES.
    """
    # Try style-specific preferences first
    if style and style in STYLE_SLOT_PREFERENCES:
        style_cats = STYLE_SLOT_PREFERENCES[style].get(slot)
        if style_cats:
            return style_cats

    # Fall back to generic slot categories
    return SLOT_CATEGORIES.get(slot, [slot])


def resolve_compatible_colors(color: str | None) -> list[str]:
    """Return a list of colors that pair well with the given color."""
    if not color:
        return DEFAULT_COMPATIBLE_COLORS
    c = color.strip().lower()
    return COLOR_COMPATIBILITY.get(c, DEFAULT_COMPATIBLE_COLORS)


def resolve_complements(category: str | None) -> list[str]:
    """Return the outfit slots for a given detected clothing category."""
    if not category:
        return ["top", "bottom", "footwear"]
    c = category.strip().lower()
    # Direct match
    if c in CATEGORY_COMPLEMENTS:
        return CATEGORY_COMPLEMENTS[c]
    # Partial match (e.g. "denim jacket" → "jacket")
    for key, slots in CATEGORY_COMPLEMENTS.items():
        if key in c:
            return slots
    # Default
    return ["top", "bottom", "footwear"]
