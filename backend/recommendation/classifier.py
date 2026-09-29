"""
Fashion product classifier.

FashionCLIP:
    visual understanding

Title:
    high-confidence semantic correction

Product metadata:
    accepted only when it is a real clothing category
"""

from __future__ import annotations

import io
import logging
import re
import threading
import time
from collections import OrderedDict
from typing import Any

import requests
from PIL import Image

from .model import (
    get_image_text_similarity,
)
from .rules import normalize_category

_logger = logging.getLogger(__name__)


# ============================================================
# CACHE
# ============================================================

_CACHE_TTL = 1800
_CACHE_MAX = 256

_cache_lock = threading.Lock()

_classification_cache: OrderedDict[
    str,
    tuple[dict[str, Any], float],
] = OrderedDict()


def _cache_get(key: str):
    with _cache_lock:
        entry = _classification_cache.get(key)

        if not entry:
            return None

        value, expires = entry

        if time.monotonic() > expires:
            del _classification_cache[key]
            return None

        _classification_cache.move_to_end(key)

        return dict(value)


def _cache_set(
    key: str,
    value: dict[str, Any],
):
    with _cache_lock:
        _classification_cache[key] = (
            dict(value),
            time.monotonic() + _CACHE_TTL,
        )

        _classification_cache.move_to_end(key)

        while len(_classification_cache) > _CACHE_MAX:
            _classification_cache.popitem(
                last=False
            )


# ============================================================
# IMAGE DOWNLOAD
# ============================================================

def _download_image(
    url: str | None,
) -> Image.Image | None:

    if not url:
        return None

    try:
        response = requests.get(
            url,
            timeout=(3, 8),
            stream=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "Chrome/126 Safari/537.36"
                ),
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )

        response.raise_for_status()

        content = response.raw.read(
            8 * 1024 * 1024
        )

        if not content:
            return None

        image = Image.open(
            io.BytesIO(content)
        )

        image.load()

        return image.convert("RGB")

    except Exception as exc:
        _logger.warning(
            "[CLASSIFIER] Image download failed: %s",
            exc,
        )

        return None


# ============================================================
# FASHIONCLIP CANDIDATES
# ============================================================

CATEGORY_LABELS = [
    "t-shirt",
    "shirt",
    "blouse",
    "polo",
    "crop top",
    "tank top",
    "camisole",
    "tunic",
    "bodysuit",

    "kurta",
    "kurti",
    "kurta set",
    "kurti set",
    "salwar suit",
    "lehenga set",
    "ethnic set",
    "saree",

    "dress",
    "shirt dress",
    "gown",
    "jumpsuit",
    "romper",
    "playsuit",
    "kaftan",
    "anarkali",

    "jeans",
    "trousers",
    "pants",
    "chinos",
    "cargo pants",
    "track pants",
    "joggers",
    "shorts",
    "skirt",
    "leggings",
    "palazzo",
    "dhoti pants",

    "jacket",
    "blazer",
    "coat",
    "cardigan",
    "hoodie",
    "sweatshirt",
    "sweater",
    "vest",
    "shrug",

    "sneakers",
    "running shoes",
    "formal shoes",
    "loafers",
    "boots",
    "sandals",
    "heels",
    "flats",
    "juttis",
    "mojaris",

    "bag",
    "handbag",
    "watch",
    "belt",
    "hat",
    "sunglasses",
    "earrings",
    "necklace",
    "bracelet",
    "scarf",
    "dupatta",
]


COLOR_LABELS = [
    "black",
    "white",
    "grey",
    "navy",
    "blue",
    "olive",
    "green",
    "beige",
    "brown",
    "cream",
    "red",
    "maroon",
    "burgundy",
    "pink",
    "yellow",
    "orange",
    "purple",
    "camel",
]


STYLE_LABELS = [
    "casual",
    "smart casual",
    "formal",
    "business casual",
    "streetwear",
    "sporty",
    "ethnic",
    "party",
    "minimalist",
]


PATTERN_LABELS = [
    "solid",
    "striped",
    "checked",
    "plaid",
    "floral",
    "printed",
    "geometric",
    "embroidered",
    "paisley",
    "polka dot",
    "graphic",
    "ribbed",
    "textured",
    "tie dye",
]


def _prompt(label: str) -> str:
    return (
        "a fashion ecommerce product photo "
        f"of a {label}"
    )


def _softmax_confidence(
    similarities: list[float],
) -> list[float]:

    if not similarities:
        return []

    maximum = max(similarities)

    temperature = 0.07

    import math

    values = [
        math.exp(
            (value - maximum)
            / temperature
        )
        for value in similarities
    ]

    total = sum(values)

    if total <= 0:
        return [
            0.0
            for _ in values
        ]

    return [
        value / total
        for value in values
    ]


def _classify_group(
    image: Image.Image,
    labels: list[str],
) -> tuple[str, float]:

    prompts = [
        _prompt(label)
        for label in labels
    ]

    similarities = get_image_text_similarity(
        image,
        prompts,
    )

    if not similarities:
        raise RuntimeError(
            "FashionCLIP returned no similarities"
        )

    confidence_values = (
        _softmax_confidence(
            similarities
        )
    )

    index = max(
        range(len(similarities)),
        key=lambda i: similarities[i],
    )

    return (
        labels[index],
        float(confidence_values[index]),
    )


def _classify_with_fashionclip(
    image: Image.Image,
) -> dict[str, Any]:

    category, category_conf = _classify_group(
        image,
        CATEGORY_LABELS,
    )

    color, color_conf = _classify_group(
        image,
        COLOR_LABELS,
    )

    style, style_conf = _classify_group(
        image,
        STYLE_LABELS,
    )

    pattern, pattern_conf = _classify_group(
        image,
        PATTERN_LABELS,
    )

    return {
        "fashionclip_category": normalize_category(
            category
        ),
        "fashionclip_color": color,
        "fashionclip_style": style,
        "fashionclip_pattern": pattern,

        "category_confidence": round(
            category_conf,
            4,
        ),
        "color_confidence": round(
            color_conf,
            4,
        ),
        "style_confidence": round(
            style_conf,
            4,
        ),
        "pattern_confidence": round(
            pattern_conf,
            4,
        ),
    }


# ============================================================
# TITLE PARSER
# ============================================================

_TITLE_CATEGORY_PATTERNS = [
    # Complete sets MUST come first.
    (
        re.compile(
            r"\bkurta\s*set\b",
            re.I,
        ),
        "kurta set",
    ),
    (
        re.compile(
            r"\bkurti\s*set\b",
            re.I,
        ),
        "kurti set",
    ),
    (
        re.compile(
            r"\bsalwar\s*(suit|set|kameez)\b",
            re.I,
        ),
        "salwar suit",
    ),
    (
        re.compile(
            r"\blehenga\s*(set|choli)\b",
            re.I,
        ),
        "lehenga set",
    ),
    (
        re.compile(
            r"\b(sharara|gharara)\s*set\b",
            re.I,
        ),
        "ethnic set",
    ),
    (
        re.compile(
            r"\bco[- ]?ord(?:inated)?\s*set\b",
            re.I,
        ),
        "co-ord set",
    ),
    (
        re.compile(
            r"\b(two|three)[ -]?piece\s*set\b",
            re.I,
        ),
        "co-ord set",
    ),
    (
        re.compile(
            r"\bethnic\s*(wear|set)\b",
            re.I,
        ),
        "ethnic set",
    ),

    # Specific full-body types.
    (
        re.compile(
            r"\bshirt\s*dress\b",
            re.I,
        ),
        "shirt dress",
    ),
    (
        re.compile(
            r"\banarkali\b",
            re.I,
        ),
        "anarkali",
    ),
    (
        re.compile(
            r"\bgown\b",
            re.I,
        ),
        "gown",
    ),
    (
        re.compile(
            r"\bjumpsuit\b",
            re.I,
        ),
        "jumpsuit",
    ),
    (
        re.compile(
            r"\bromper\b",
            re.I,
        ),
        "romper",
    ),
    (
        re.compile(
            r"\bplaysuit\b",
            re.I,
        ),
        "playsuit",
    ),
    (
        re.compile(
            r"\bkaftan\b",
            re.I,
        ),
        "kaftan",
    ),
    (
        re.compile(
            r"\bsaree\b|\bsari\b",
            re.I,
        ),
        "saree",
    ),
    (
        re.compile(
            r"\blehenga\b",
            re.I,
        ),
        "lehenga",
    ),

    # Tops.
    (
        re.compile(
            r"\bt[- ]?shirt\b|\btee\b",
            re.I,
        ),
        "t-shirt",
    ),
    (
        re.compile(
            r"\bpolo\b",
            re.I,
        ),
        "polo",
    ),
    (
        re.compile(
            r"\bblouse\b",
            re.I,
        ),
        "blouse",
    ),
    (
        re.compile(
            r"\bcrop\s*top\b",
            re.I,
        ),
        "crop top",
    ),
    (
        re.compile(
            r"\btank\s*top\b",
            re.I,
        ),
        "tank top",
    ),
    (
        re.compile(
            r"\bcamisole\b",
            re.I,
        ),
        "camisole",
    ),
    (
        re.compile(
            r"\bbodysuit\b",
            re.I,
        ),
        "bodysuit",
    ),
    (
        re.compile(
            r"\btunic\b",
            re.I,
        ),
        "tunic",
    ),

    # Ethnic individual garments.
    (
        re.compile(
            r"\bkurta\b",
            re.I,
        ),
        "kurta",
    ),
    (
        re.compile(
            r"\bkurti\b",
            re.I,
        ),
        "kurti",
    ),

    # Bottoms.
    (
        re.compile(
            r"\bjeans?\b|\bdenim\b",
            re.I,
        ),
        "jeans",
    ),
    (
        re.compile(
            r"\btrousers?\b",
            re.I,
        ),
        "trousers",
    ),
    (
        re.compile(
            r"\bchinos?\b",
            re.I,
        ),
        "chinos",
    ),
    (
        re.compile(
            r"\bcargo\s*pants?\b",
            re.I,
        ),
        "cargo pants",
    ),
    (
        re.compile(
            r"\btrack\s*pants?\b",
            re.I,
        ),
        "track pants",
    ),
    (
        re.compile(
            r"\bjoggers?\b",
            re.I,
        ),
        "joggers",
    ),
    (
        re.compile(
            r"\bshorts?\b",
            re.I,
        ),
        "shorts",
    ),
    (
        re.compile(
            r"\bskirt\b",
            re.I,
        ),
        "skirt",
    ),
    (
        re.compile(
            r"\bleggings?\b",
            re.I,
        ),
        "leggings",
    ),
    (
        re.compile(
            r"\bpalazzo\b",
            re.I,
        ),
        "palazzo",
    ),
    (
        re.compile(
            r"\bdhoti\s*pants?\b",
            re.I,
        ),
        "dhoti pants",
    ),

    # Outerwear.
    (
        re.compile(
            r"\bblazer\b",
            re.I,
        ),
        "blazer",
    ),
    (
        re.compile(
            r"\bjacket\b|\bbomber\b|\bpuffer\b|\bwindbreaker\b",
            re.I,
        ),
        "jacket",
    ),
    (
        re.compile(
            r"\bcoat\b|\bovercoat\b",
            re.I,
        ),
        "coat",
    ),
    (
        re.compile(
            r"\bcardigan\b",
            re.I,
        ),
        "cardigan",
    ),
    (
        re.compile(
            r"\bhoodie\b",
            re.I,
        ),
        "hoodie",
    ),
    (
        re.compile(
            r"\bsweatshirt\b",
            re.I,
        ),
        "sweatshirt",
    ),
    (
        re.compile(
            r"\bsweater\b",
            re.I,
        ),
        "sweater",
    ),

    # Footwear.
    (
        re.compile(
            r"\brunning\s*shoes?\b",
            re.I,
        ),
        "running shoes",
    ),
    (
        re.compile(
            r"\bsneakers?\b",
            re.I,
        ),
        "sneakers",
    ),
    (
        re.compile(
            r"\bformal\s*shoes?\b",
            re.I,
        ),
        "formal shoes",
    ),
    (
        re.compile(
            r"\bloafers?\b",
            re.I,
        ),
        "loafers",
    ),
    (
        re.compile(
            r"\bboots?\b",
            re.I,
        ),
        "boots",
    ),
    (
        re.compile(
            r"\bsandals?\b",
            re.I,
        ),
        "sandals",
    ),
    (
        re.compile(
            r"\bheels?\b",
            re.I,
        ),
        "heels",
    ),
    (
        re.compile(
            r"\bflats?\b",
            re.I,
        ),
        "flats",
    ),
    (
        re.compile(
            r"\bjuttis?\b",
            re.I,
        ),
        "juttis",
    ),
    (
        re.compile(
            r"\bmojaris?\b",
            re.I,
        ),
        "mojaris",
    ),

    # Accessories.
    (
        re.compile(
            r"\bhandbag\b",
            re.I,
        ),
        "handbag",
    ),
    (
        re.compile(
            r"\bbag\b|\btote\b|\bpurse\b",
            re.I,
        ),
        "bag",
    ),
    (
        re.compile(
            r"\bwatch\b",
            re.I,
        ),
        "watch",
    ),
    (
        re.compile(
            r"\bbelt\b",
            re.I,
        ),
        "belt",
    ),
    (
        re.compile(
            r"\bsunglasses\b",
            re.I,
        ),
        "sunglasses",
    ),
    (
        re.compile(
            r"\bearrings?\b",
            re.I,
        ),
        "earrings",
    ),
    (
        re.compile(
            r"\bnecklace\b",
            re.I,
        ),
        "necklace",
    ),
    (
        re.compile(
            r"\bbracelet\b",
            re.I,
        ),
        "bracelet",
    ),
    (
        re.compile(
            r"\bdupatta\b",
            re.I,
        ),
        "dupatta",
    ),
]


_TITLE_COLOR_PATTERNS = [
    (r"\bolive\s*green\b", "olive"),
    (r"\bolive\b", "olive"),
    (r"\bnavy\s*blue\b", "navy"),
    (r"\bnavy\b", "navy"),
    (r"\bcharcoal\b", "grey"),
    (r"\bgrey\b|\bgray\b", "grey"),
    (r"\bbeige\b", "beige"),
    (r"\bcream\b", "cream"),
    (r"\bcamel\b", "camel"),
    (r"\bburgundy\b", "burgundy"),
    (r"\bmaroon\b", "maroon"),
    (r"\bblack\b", "black"),
    (r"\bwhite\b", "white"),
    (r"\bblue\b", "blue"),
    (r"\bgreen\b", "green"),
    (r"\bbrown\b", "brown"),
    (r"\bred\b", "red"),
    (r"\bpink\b", "pink"),
    (r"\byellow\b", "yellow"),
    (r"\borange\b", "orange"),
    (r"\bpurple\b", "purple"),
]


_GENDER_PATTERNS = [
    (
        re.compile(
            r"\bmen'?s\b|\bmen\b|\bboy'?s\b|\bboys\b",
            re.I,
        ),
        "men",
    ),
    (
        re.compile(
            r"\bwomen'?s\b|\bwomen\b|\bwom[ae]n\b"
            r"|\blad(?:ies|y)'?s\b|\bgirls?\b",
            re.I,
        ),
        "women",
    ),
    (
        re.compile(
            r"\bunisex\b",
            re.I,
        ),
        "unisex",
    ),
]


def _parse_title_attributes(
    title: str,
) -> dict[str, Any]:

    result = {
        "title_category": None,
        "title_color": None,
        "title_gender": None,
        "title_style": None,
        "title_pattern": None,
    }

    if not title:
        return result

    # Category
    for pattern, category in _TITLE_CATEGORY_PATTERNS:
        if pattern.search(title):
            result["title_category"] = normalize_category(
                category
            )
            break

    # Color
    for pattern, color in _TITLE_COLOR_PATTERNS:
        if re.search(
            pattern,
            title,
            re.I,
        ):
            result["title_color"] = color
            break

    # Gender
    for pattern, gender in _GENDER_PATTERNS:
        if pattern.search(title):
            result["title_gender"] = gender
            break

    # Style — most specific first.
    if re.search(
        r"\bbusiness\s*casual\b",
        title,
        re.I,
    ):
        result["title_style"] = "business casual"

    elif re.search(
        r"\bsmart\s*casual\b",
        title,
        re.I,
    ):
        result["title_style"] = "smart casual"

    elif re.search(
        r"\bstreetwear\b|\bstreet\s*style\b",
        title,
        re.I,
    ):
        result["title_style"] = "streetwear"

    elif re.search(
        r"\bformal\b|\boffice\b",
        title,
        re.I,
    ):
        result["title_style"] = "formal"

    elif re.search(
        r"\bsporty\b|\bsportswear\b|\bgym\b|\bactivewear\b",
        title,
        re.I,
    ):
        result["title_style"] = "sporty"

    elif re.search(
        r"\bethnic\b|\btraditional\b|\bkurta\b|\bkurti\b"
        r"|\bsalwar\b|\blehenga\b|\bsaree\b",
        title,
        re.I,
    ):
        result["title_style"] = "ethnic"

    elif re.search(
        r"\bparty\b|\bpartywear\b",
        title,
        re.I,
    ):
        result["title_style"] = "party"

    elif re.search(
        r"\bstreet\b|\burban\b",
        title,
        re.I,
    ):
        result["title_style"] = "streetwear"

    elif re.search(
        r"\bcasual\b",
        title,
        re.I,
    ):
        result["title_style"] = "casual"

    # Pattern.
    pattern_map = [
        (r"\bstriped?\b|\bstripes?\b", "striped"),
        (r"\bchecks?\b|\bchecked\b", "checked"),
        (r"\bplaid\b", "plaid"),
        (r"\bfloral\b", "floral"),
        (r"\bembroidered\b|\bembroidery\b", "embroidered"),
        (r"\bpolka\s*dot\b", "polka dot"),
        (r"\bpaisley\b", "paisley"),
        (r"\bgraphic\b", "graphic"),
        (r"\bribbed\b", "ribbed"),
        (r"\btie\s*dye\b", "tie dye"),
        (r"\bprinted\b|\bprint\b", "printed"),
        (r"\btextured\b", "textured"),
    ]

    for pattern, value in pattern_map:
        if re.search(
            pattern,
            title,
            re.I,
        ):
            result["title_pattern"] = value
            break

    return result


# ============================================================
# MAIN
# ============================================================

def classify_product(
    image_url: str | None,
    title: str | None = None,
    product_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:

    title = title or ""

    cache_key = (
        f"{image_url or ''}|"
        f"{title.lower().strip()}"
    )

    cached = _cache_get(cache_key)

    if cached:
        return cached

    title_attrs = _parse_title_attributes(
        title
    )

    fashionclip_result: dict[str, Any] = {}

    image = None

    if image_url:
        image = _download_image(
            image_url
        )

    if image is not None:
        try:
            fashionclip_result = (
                _classify_with_fashionclip(
                    image
                )
            )

            _logger.info(
                "[CLASSIFIER] FashionCLIP result: %s",
                fashionclip_result,
            )

        except Exception as exc:
            _logger.exception(
                "[CLASSIFIER] FashionCLIP failed: %s",
                exc,
            )

    # --------------------------------------------------------
    # Resolve final attributes.
    #
    # Explicit title category has priority because titles such
    # as "Slim Fit Casual Shirt" and "Kurta Set" are highly
    # informative.
    # --------------------------------------------------------

    fashion_category = normalize_category(
        fashionclip_result.get(
            "fashionclip_category"
        )
    )

    title_category = normalize_category(
        title_attrs.get(
            "title_category"
        )
    )

    final_category = (
        title_category
        or fashion_category
    )

    fashion_color = fashionclip_result.get(
        "fashionclip_color"
    )

    title_color = title_attrs.get(
        "title_color"
    )

    final_color = (
        title_color
        or fashion_color
    )

    fashion_style = fashionclip_result.get(
        "fashionclip_style"
    )

    title_style = title_attrs.get(
        "title_style"
    )

    final_style = (
        title_style
        or fashion_style
    )

    fashion_pattern = fashionclip_result.get(
        "fashionclip_pattern"
    )

    title_pattern = title_attrs.get(
        "title_pattern"
    )

    final_pattern = (
        title_pattern
        or fashion_pattern
    )

    # Gender is primarily metadata/title derived.
    gender = None

    metadata = product_metadata or {}

    metadata_gender = str(
        metadata.get("gender") or ""
    ).strip().lower()

    if metadata_gender in {
        "men",
        "male",
        "mens",
        "women",
        "female",
        "womens",
        "unisex",
    }:
        if metadata_gender in {
            "male",
            "mens",
        }:
            gender = "men"
        elif metadata_gender in {
            "female",
            "womens",
        }:
            gender = "women"
        else:
            gender = metadata_gender

    gender = (
        title_attrs.get("title_gender")
        or gender
    )

    source = (
        "fashionclip+title"
        if fashionclip_result
        else "title"
    )

    result = {
        "category": final_category,
        "color": final_color,
        "style": final_style,
        "pattern": final_pattern,
        "gender": gender,

        "confidence": round(
            float(
                fashionclip_result.get(
                    "category_confidence",
                    0.0,
                )
            ),
            4,
        ),

        "category_confidence": fashionclip_result.get(
            "category_confidence",
            0.0,
        ),

        "color_confidence": fashionclip_result.get(
            "color_confidence",
            0.0,
        ),

        "style_confidence": fashionclip_result.get(
            "style_confidence",
            0.0,
        ),

        "pattern_confidence": fashionclip_result.get(
            "pattern_confidence",
            0.0,
        ),

        "fashionclip_category": fashion_category,
        "fashionclip_color": fashion_color,
        "fashionclip_style": fashion_style,
        "fashionclip_pattern": fashion_pattern,

        "title_category": title_category,
        "title_color": title_color,
        "title_style": title_style,
        "title_pattern": title_pattern,

        "source": source,
    }

    _cache_set(
        cache_key,
        result,
    )

    return result