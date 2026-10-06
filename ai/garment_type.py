"""Classify catalog text into CatVTON's supported garment mask types."""

from __future__ import annotations

import re
from typing import Optional

_OVERALL_PATTERN = re.compile(
    r"\b(?:dress(?:es)?|gown(?:s)?|jumpsuit(?:s)?|romper(?:s)?|playsuit(?:s)?|"
    r"one[ -]?piece|saree(?:s)?|sari(?:s)?|kaftan(?:s)?|kurta[ -]?set(?:s)?|"
    r"salwar[ -]?suit(?:s)?|co[ -]?ord(?:inate)?(?:[ -]?set)?s?|tracksuit(?:s)?)\b",
    re.IGNORECASE,
)
_LOWER_PATTERN = re.compile(
    r"\b(?:jeans?|trousers?|pants?|shorts?|skirts?|leggings?|jeggings?|joggers?|"
    r"track[ -]?pants?|sweatpants?|chinos?|cargos?|culottes?|palazzos?|salwars?|"
    r"pyjamas?|pajamas?|dhoti(?:s)?)\b",
    re.IGNORECASE,
)
_UPPER_PATTERN = re.compile(
    r"\b(?:t[ -]?shirts?|shirts?|tops?|blouses?|tunics?|jackets?|blazers?|coats?|"
    r"hoodies?|sweatshirts?|sweaters?|cardigans?|polos?|kurtas?|tees?)\b",
    re.IGNORECASE,
)
SUPPORTED_CLOTH_TYPES = frozenset({"upper", "lower", "overall", "inner", "outer"})


def detect_garment_type(*values: object) -> Optional[str]:
    """Return upper/lower/overall when catalog title or category is recognizable."""
    text = " ".join(str(value or "") for value in values)
    if _OVERALL_PATTERN.search(text):
        return "overall"
    if _LOWER_PATTERN.search(text):
        return "lower"
    if _UPPER_PATTERN.search(text):
        return "upper"
    return None


def resolve_garment_type(
    requested_type: Optional[str],
    *metadata: object,
) -> str:
    """Prefer recognized catalog metadata; otherwise use a valid request or upper."""
    detected = detect_garment_type(*metadata)
    if detected:
        return detected
    requested = str(requested_type or "").strip().lower()
    return requested if requested in SUPPORTED_CLOTH_TYPES else "upper"
