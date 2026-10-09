from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import logging
import json
import os
import re
import requests
import threading
import time
import tempfile
from urllib.parse import parse_qs, urlparse


from pathlib import Path
import sys

_backend_dir = str(Path(__file__).resolve().parent)
_project_root = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Load backend/.env first, then root .env as fallback
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv()

from app.networking import frontend_origins, service_port



# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Thread-safe TTL cache
# ---------------------------------------------------------------------------

class _TTLCache:
    """
    Disk-backed cache with per-entry TTL and bounded capacity.

    Entries are written under the project `.cache/` directory, so product and
    search responses survive a backend restart. Expired entries are lazily
    evicted on get().
    When maxsize is reached the entry whose TTL expires soonest
    is evicted to make room (LRU-by-expiry strategy).
    All methods are protected by a threading.Lock.
    """

    def __init__(
        self,
        cache_file: Path,
        maxsize: int = 512,
        default_ttl: float = 86400,
    ):
        self._store: dict = {}   # key -> (value, expires_at as Unix timestamp)
        self._lock = threading.Lock()
        self._maxsize = maxsize
        self._default_ttl = default_ttl
        self._cache_file = cache_file
        self._cache_file.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self) -> None:
        """Restore valid responses from a previous backend process."""
        if not self._cache_file.exists():
            return
        try:
            raw_store = json.loads(self._cache_file.read_text(encoding="utf-8"))
            if not isinstance(raw_store, dict):
                return
            now = time.time()
            self._store = {
                key: (entry["value"], float(entry["expires_at"]))
                for key, entry in raw_store.items()
                if isinstance(entry, dict)
                and "value" in entry
                and float(entry.get("expires_at", 0)) > now
            }
            if self._store:
                _logger.info(
                    "[CACHE RESTORED] %d valid entries from %s",
                    len(self._store),
                    self._cache_file.name,
                )
        except (OSError, ValueError, TypeError) as exc:
            _logger.warning("Could not read cache file %s: %s", self._cache_file, exc)
            self._store = {}

    def _persist(self) -> None:
        """Atomically persist cache data without exposing a partial JSON file."""
        payload = {
            key: {"value": value, "expires_at": expires_at}
            for key, (value, expires_at) in self._store.items()
        }
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self._cache_file.parent,
                delete=False,
            ) as temporary:
                json.dump(payload, temporary, ensure_ascii=False, separators=(",", ":"))
                temporary_path = Path(temporary.name)
            temporary_path.replace(self._cache_file)
        except (OSError, TypeError) as exc:
            _logger.warning("Could not persist cache file %s: %s", self._cache_file, exc)
            try:
                temporary_path.unlink(missing_ok=True)
            except UnboundLocalError:
                pass

    def get(self, key: str):
        """Return cached value or None if absent / expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                self._persist()
                return None
            return value

    def set(self, key: str, value, ttl: float | None = None):
        """Store value with given ttl (seconds)."""
        if ttl is None:
            ttl = self._default_ttl
        with self._lock:
            if key not in self._store and len(self._store) >= self._maxsize:
                oldest = min(self._store, key=lambda k: self._store[k][1])
                del self._store[oldest]
            self._store[key] = (value, time.time() + ttl)
            self._persist()


# Cache responses for 24 hours, including across backend restarts. Override the
# duration with BACKEND_CACHE_TTL_SECONDS when a shorter cache is needed.
_CACHE_DIR = Path(_project_root) / ".cache"
_BACKEND_CACHE_TTL = int(os.getenv("BACKEND_CACHE_TTL_SECONDS", "86400"))
_PRODUCT_TTL = _BACKEND_CACHE_TTL
_SEARCH_TTL = _BACKEND_CACHE_TTL

_product_cache = _TTLCache(
    _CACHE_DIR / "products.json", maxsize=512, default_ttl=_PRODUCT_TTL
)
_search_cache = _TTLCache(
    _CACHE_DIR / "searches.json", maxsize=256, default_ttl=_SEARCH_TTL
)


# ---------------------------------------------------------------------------
# Cache key helpers  (normalise key only – Oxylabs payload is unchanged)
# ---------------------------------------------------------------------------

def _product_key(asin: str, domain: str, geo_location: str) -> str:
    return f"product:{asin.strip().upper()}:{domain.strip().lower()}:{geo_location.strip().lower()}"


def _search_key(query: str, domain: str, geo_location: str) -> str:
    q = re.sub(r"\s+", " ", query.strip().lower())
    return f"search:{q}:{domain.strip().lower()}:{geo_location.strip().lower()}"


# Products are displayed to every visitor, so this exclusion is deliberately
# applied on the server rather than relying on search terms or the frontend.
# It covers adult, child, and gender-specific labels alike.
_INTIMATE_APPAREL_PATTERN = re.compile(
    r"\b(?:"
    r"underwear|underwears|underclothes|innerwear|inner\s+wear|undergarment(?:s)?|"
    r"lingerie|bra(?:s|lette)?|brassiere|"
    r"pant(?:y|ies)|brief(?:s)?|boxer(?:s|\s+briefs)?|trunk(?:s)?|thong(?:s)?|"
    r"g[ -]?string|jockstrap|athletic\s+supporter|cup\s+supporter|"
    r"shapewear|body\s*shaper|compression\s+(?:shorts|briefs|underwear)|"
    r"slip(?:s)?|petticoat(?:s)?|camisole(?:s)?|teddy(?:ies)?|"
    r"hipster(?:s)?|boyshorts?|boy\s+shorts?|"
    r"undershirt(?:s)?|under\s+shirt(?:s)?|singlet(?:s)?|"
    r"(?:cotton\s+|sleeveless\s+|inner\s+)?vest(?:s)?|"
    r"diaper(?:s)?|napp(?:y|ies)|training\s+pants"
    r")\b",
    re.IGNORECASE,
)

_SUPPORTIVE_INNERWEAR_PATTERN = re.compile(
    r"\b(?:"
    r"front\s+support|"
    r"(?:light|medium|firm|high)\s+compression|"
    r"compression\s+(?:tee|t-?shirt|shirt|top|wear)|"
    r"cuddle\s+tee"
    r")\b",
    re.IGNORECASE,
)

# CatVTON is designed for clothing, not Amazon's wider catalogue. Keep this
# allow-list deliberately garment-focused so a pasted electronics, beauty, or
# home-product link cannot be sent to the try-on service.
_TRYON_CLOTHING_PATTERN = re.compile(
    r"\b(?:"
    r"clothing|apparel|garment|outfit|"
    r"dress(?:es)?|gown(?:s)?|jumpsuit(?:s)?|romper(?:s)?|"
    r"shirt(?:s)?|t[ -]?shirt(?:s)?|tee(?:s)?|top(?:s)?|blouse(?:s)?|"
    r"sweater(?:s)?|cardigan(?:s)?|hoodie(?:s)?|sweatshirt(?:s)?|"
    r"jacket(?:s)?|blazer(?:s)?|coat(?:s)?|overcoat(?:s)?|"
    r"jeans|denim|trouser(?:s)?|pant(?:s)?|short(?:s)?|skirt(?:s)?|"
    r"legging(?:s)?|jogger(?:s)?|track ?pant(?:s)?|pajama(?:s)?|pyjama(?:s)?|"
    r"kurta(?:s)?|kurti(?:s)?|anarkali(?:s)?|saree(?:s)?|sari(?:s)?|"
    r"lehenga(?:s)?|choli(?:s)?|salwar|kameez|palazzo(?:s)?|plazo(?:s)?|"
    r"sherwani(?:s)?|dhoti(?:s)?|mundu|lungi(?:s)?|kaftan(?:s)?"
    r")\b",
    re.IGNORECASE,
)


def _product_text(value) -> str:
    """Flatten product metadata into searchable text without assuming a schema."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(_product_text(item) for item in value.values())
    if isinstance(value, (list, tuple, set)):
        return " ".join(_product_text(item) for item in value)
    return ""


def is_restricted_intimate_product(product: dict) -> bool:
    """True when product metadata identifies underwear or another undergarment."""
    if not isinstance(product, dict):
        return False
    metadata = (
        product.get("title"),
        product.get("brand"),
        product.get("category"),
        product.get("categories"),
        product.get("category_path"),
        product.get("product_overview"),
    )
    product_text = _product_text(metadata)
    return bool(
        _INTIMATE_APPAREL_PATTERN.search(product_text)
        or _SUPPORTIVE_INNERWEAR_PATTERN.search(product_text)
    )


def is_tryon_clothing_product(product: dict) -> bool:
    """Whether Amazon metadata describes a garment supported by virtual try-on."""
    if not isinstance(product, dict) or is_restricted_intimate_product(product):
        return False
    metadata = (
        product.get("title"),
        product.get("category"),
        product.get("categories"),
        product.get("category_path"),
        product.get("product_overview"),
    )
    return bool(_TRYON_CLOTHING_PATTERN.search(_product_text(metadata)))


def filter_allowed_products(products: list[dict]) -> list[dict]:
    """Remove restricted intimate apparel from fresh and persisted search data."""
    return [
        product for product in products
        if isinstance(product, dict) and not is_restricted_intimate_product(product)
    ]


app = FastAPI(
    title="Amazon Product API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Recommendation router (new — FashionCLIP outfit recommendations)
# ---------------------------------------------------------------------------

from recommendation.router import router as _recommendation_router
app.include_router(_recommendation_router)

# ---------------------------------------------------------------------------
# Auth, User, Admin routers & Database Init
# ---------------------------------------------------------------------------
import sys
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

try:
    from app.routes.auth import router as _auth_router
    from app.routes.users import router as _users_router
    from app.routes.admin import router as _admin_router
    from app.routes.dwm import router as _dwm_router
    from app.routes.tryon_record import router as _tryon_record_router
    from app.database.connection import create_all_tables as _create_all_tables
    app.include_router(_auth_router)
    app.include_router(_users_router)
    app.include_router(_admin_router)
    app.include_router(_dwm_router)
    app.include_router(_tryon_record_router)
    _create_all_tables()
    _logger.info("Auth, user, admin, DWM analytics, and try-on record routes loaded successfully.")
except Exception as _e:
    _logger.warning("Could not initialize auth/admin/dwm routes: %s", _e)



OXYLABS_URL = "https://realtime.oxylabs.io/v1/queries"

OXYLABS_USERNAME = os.getenv("OXYLABS_USERNAME")
OXYLABS_PASSWORD = os.getenv("OXYLABS_PASSWORD")


ALLOWED_DOMAINS = {
    "com",
    "in",
    "ca",
    "co.uk",
    "de",
    "fr",
    "it",
    "es",
    "ae",
    "co.jp",
    "com.au",
}


def clean_url(value):

    if not value:
        return None

    value = str(value)

    value = value.replace("\\_", "_")
    value = value.replace("\\/", "/")
    value = value.replace("\\.", ".")
    value = value.replace("\\-", "-")
    value = value.replace("\\", "")

    markdown_match = re.search(
        r"\]\(\s*(https?://[^)\s]+)\s*\)",
        value
    )

    if markdown_match:
        return markdown_match.group(1).strip()

    url_match = re.search(
        r"https?://[^\s\]\)]+",
        value
    )

    if url_match:
        return url_match.group(0).strip()

    return None


def parse_amazon_product_url(value: str) -> tuple[str, str]:
    """Extract an ASIN and supported marketplace from a canonical Amazon URL."""
    url = clean_url(value)
    if not url:
        raise ValueError("Please paste a valid Amazon product link.")

    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    hostname = re.sub(r"^(?:www\.|m\.)", "", hostname)
    if not hostname.startswith("amazon."):
        raise ValueError("Please paste a valid Amazon product link.")

    domain = hostname.removeprefix("amazon.")
    if domain not in ALLOWED_DOMAINS:
        raise ValueError("This Amazon marketplace is not supported.")

    asin_match = re.search(
        r"/(?:dp|gp/product|gp/aw/d)/([A-Za-z0-9]{10})(?:/|$)",
        parsed.path,
        re.IGNORECASE,
    )
    query_asin = parse_qs(parsed.query).get("asin", [None])[0]
    asin = asin_match.group(1) if asin_match else query_asin
    if not isinstance(asin, str) or not re.fullmatch(r"[A-Za-z0-9]{10}", asin):
        raise ValueError("Please paste a valid Amazon product link.")

    return asin.upper(), domain


def clean_images(raw_images):

    if not raw_images:
        return []

    if isinstance(raw_images, str):
        raw_images = [raw_images]

    if not isinstance(raw_images, list):
        return []

    images = []
    seen = set()

    for item in raw_images:

        url = clean_url(item)

        if not url:
            continue

        url = url.rstrip(".,;)")

        if not url.startswith("http"):
            continue

        if url in seen:
            continue

        seen.add(url)
        images.append(url)

    return images


def oxylabs_request(
    asin,
    domain="in",
    geo_location=""
):

    if not OXYLABS_USERNAME or not OXYLABS_PASSWORD:

        raise HTTPException(
            status_code=500,
            detail="Oxylabs username/password missing in .env"
        )

    payload = {
        "source": "amazon_product",
        "query": asin,
        "geo_location": geo_location,
        "domain": domain,
        "parse": True,
    }

    try:

        response = requests.post(
            OXYLABS_URL,
            auth=(
                OXYLABS_USERNAME,
                OXYLABS_PASSWORD,
            ),
            json=payload,
            timeout=120,
        )

    except requests.exceptions.Timeout:

        raise HTTPException(
            status_code=504,
            detail="Oxylabs product request timed out."
        )

    except requests.exceptions.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=f"Oxylabs product request failed: {str(e)}"
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Oxylabs returned an error",
                "status_code": response.status_code,
                "response": response.text[:2000],
            },
        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="Oxylabs returned invalid JSON."
        )


def oxylabs_search_request(
    query,
    domain="in",
    geo_location="",
    start_page=1,
    pages=1,
    sort_by="featured",
):

    if not OXYLABS_USERNAME or not OXYLABS_PASSWORD:

        raise HTTPException(
            status_code=500,
            detail="Oxylabs username/password missing in .env"
        )

    payload = {
        "source": "amazon_search",
        "query": query,
        "geo_location": geo_location,
        "domain": domain,
        "start_page": start_page,
        "pages": pages,
        "parse": True,
        "sort_by": sort_by,
    }

    try:

        response = requests.post(
            OXYLABS_URL,
            auth=(
                OXYLABS_USERNAME,
                OXYLABS_PASSWORD,
            ),
            json=payload,
            timeout=120,
        )

    except requests.exceptions.Timeout:

        raise HTTPException(
            status_code=504,
            detail="Oxylabs search request timed out."
        )

    except requests.exceptions.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=f"Oxylabs search request failed: {str(e)}"
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Oxylabs returned an error",
                "status_code": response.status_code,
                "response": response.text[:2000],
            },
        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="Oxylabs returned invalid JSON."
        )


def extract_content(data):

    if not isinstance(data, dict):
        return {}

    results = data.get("results")

    if isinstance(results, list):

        for result in results:

            if not isinstance(result, dict):
                continue

            content = result.get("content")

            if isinstance(content, dict):
                return content

    content = data.get("content")

    if isinstance(content, dict):
        return content

    return {}


def extract_search_contents(data):

    if not isinstance(data, dict):
        return []

    results = data.get("results")

    if not isinstance(results, list):
        return []

    contents = []

    for result in results:

        if not isinstance(result, dict):
            continue

        content = result.get("content")

        if isinstance(content, dict):
            contents.append(content)

    return contents


def get_refinement_groups(content):

    refinements = content.get(
        "refinements",
        {}
    )

    if not isinstance(refinements, dict):
        return {}

    return refinements


def extract_refinement_values(
    refinements,
    possible_keys
):

    values = []
    seen = set()

    for key in possible_keys:

        items = refinements.get(
            key,
            []
        )

        if not isinstance(items, list):
            continue

        for item in items:

            if not isinstance(item, dict):
                continue

            name = item.get("name")

            if not name:
                continue

            name = str(name).strip()

            if not name:
                continue

            name = re.sub(
                r"^Apply\s+",
                "",
                name,
                flags=re.IGNORECASE
            )

            name = re.sub(
                r"\s+filter\s+to\s+narrow\s+results$",
                "",
                name,
                flags=re.IGNORECASE
            )

            name = name.strip()

            if not name:
                continue

            normalized = name.lower()

            if normalized in seen:
                continue

            seen.add(normalized)

            values.append(name)

    return values


def collect_search_facets(contents):

    gender = set()
    colors = set()
    sizes = set()

    for content in contents:

        refinements = get_refinement_groups(
            content
        )

        gender_values = extract_refinement_values(
            refinements,
            [
                "gender",
                "department",
            ]
        )

        color_values = extract_refinement_values(
            refinements,
            [
                "color",
                "colors",
            ]
        )

        size_values = extract_refinement_values(
            refinements,
            [
                "mens_clothing_size",
                "womens_clothing_size",
                "clothing_size",
                "size",
                "size_name",
            ]
        )

        gender.update(
            gender_values
        )

        colors.update(
            color_values
        )

        sizes.update(
            size_values
        )

    return {
        "gender": sorted(
            gender,
            key=str.lower
        ),
        "color": sorted(
            colors,
            key=str.lower
        ),
        "size": sorted(
            sizes,
            key=str.lower
        ),
    }


def normalize_search_product(
    product,
    domain
):

    if not isinstance(product, dict):
        return None

    # Oxylabs may place the category only in nested metadata, so inspect its
    # original response before reducing it to the public search schema.
    if is_restricted_intimate_product(product):
        return None

    asin = product.get("asin")
    title = product.get("title")

    if not asin or not title:
        return None

    relative_url = product.get("url")

    if relative_url:

        if relative_url.startswith("/"):

            product_url = (
                f"https://www.amazon.{domain}"
                f"{relative_url}"
            )

        else:

            product_url = clean_url(
                relative_url
            )

    else:

        product_url = (
            f"https://www.amazon.{domain}"
            f"/dp/{asin}"
        )

    image = (
        clean_url(
            product.get("url_image")
        )
        or clean_url(
            product.get("image")
        )
    )

    price = product.get("price")

    try:

        numeric_price = (
            float(price)
            if price is not None
            else None
        )

    except (
        ValueError,
        TypeError
    ):

        numeric_price = None

    normalized = {

        "asin": asin,

        "brand":
            product.get("brand")
            or product.get("manufacturer"),

        "title":
            title,

        # Keep source attributes so the collection's colour and size filters
        # can normalize real Amazon metadata rather than only guessing from
        # the listing title.
        "color":
            product.get("color")
            or product.get("colour")
            or product.get("color_name"),

        "sizes":
            product.get("sizes")
            or product.get("size")
            or [],

        "price":
            numeric_price,

        "currency":
            product.get(
                "currency",
                "INR"
            ),

        "rating":
            product.get("rating"),

        "reviews_count":
            product.get(
                "reviews_count"
            ),

        "image":
            image,

        "url":
            product_url,

        "is_sponsored":
            product.get(
                "is_sponsored",
                False
            ),

        "is_prime":
            product.get(
                "is_prime",
                False
            ),

        "shipping_information":
            product.get(
                "shipping_information"
            ),

        "price_strikethrough":
            product.get(
                "price_strikethrough"
            ),

        "sales_volume":
            product.get(
                "sales_volume"
            ),
    }

    return None if is_restricted_intimate_product(normalized) else normalized


def collect_search_products(
    query,
    domain,
    geo_location
):

    all_products = {}
    all_contents = []

    search_queries = [
        query,
    ]

    search_modes = [
        "featured",
        "price_low_to_high",
        "price_high_to_low",
    ]

    for search_query in search_queries:

        for sort_mode in search_modes:

            raw_response = oxylabs_search_request(

                query=search_query,

                domain=domain,

                geo_location=geo_location,

                start_page=1,

                pages=1,

                sort_by=sort_mode,

            )

            contents = extract_search_contents(
                raw_response
            )

            all_contents.extend(
                contents
            )

            for content in contents:

                results = content.get(
                    "results",
                    {}
                )

                if not isinstance(
                    results,
                    dict
                ):
                    continue

                organic_products = results.get(
                    "organic",
                    []
                )

                if not isinstance(
                    organic_products,
                    list
                ):
                    continue

                for product in organic_products:

                    normalized = (
                        normalize_search_product(
                            product,
                            domain
                        )
                    )

                    if not normalized:
                        continue

                    asin = normalized[
                        "asin"
                    ]

                    if asin not in all_products:

                        all_products[
                            asin
                        ] = normalized

    facets = collect_search_facets(
        all_contents
    )

    return (
        list(
            all_products.values()
        ),
        facets
    )


def normalize_product(
    content,
    asin,
    domain,
    geo_location
):

    if not isinstance(
        content,
        dict
    ):
        content = {}

    images = clean_images(
        content.get(
            "images",
            []
        )
    )

    main_image = (
        images[0]
        if images
        else clean_url(
            content.get(
                "image"
            )
        )
    )

    amazon_url = clean_url(
        content.get(
            "url"
        )
    )

    if not amazon_url:

        amazon_url = (
            f"https://www.amazon.{domain}"
            f"/dp/{asin}"
        )

    price = content.get(
        "price"
    )

    currency = content.get(
        "currency",
        "INR"
    )

    price_inr = None

    if price is not None:

        try:

            numeric_price = float(
                price
            )

            if str(
                currency
            ).upper() == "INR":

                price_inr = numeric_price

            elif str(
                currency
            ).upper() == "USD":

                price_inr = round(
                    numeric_price * 83,
                    2
                )

        except (
            ValueError,
            TypeError
        ):

            price_inr = None

    return {

        "asin":
            content.get(
                "asin"
            ) or asin,

        "url":
            amazon_url,

        "brand":
            content.get(
                "brand"
            ),

        "price":
            price,

        "currency":
            currency,

        "price_inr":
            price_inr,

        "stock":
            content.get(
                "stock"
            ),

        "title":
            content.get(
                "title"
            ),

        "rating":
            content.get(
                "rating"
            ),

        "reviews_count":
            content.get(
                "reviews_count"
            ),

        "image":
            main_image,

        "images":
            images,

        "categories":
            content.get(
                "categories",
                []
            ),

        "category_path":
            content.get(
                "category_path",
                []
            ),

        "buybox":
            content.get(
                "buybox",
                []
            ),

        "product_overview":
            content.get(
                "product_overview",
                []
            ),

        "amazon_domain":
            domain,

        "geo_location":
            geo_location,

    }


@app.get("/")
def home():

    return {

        "status":
            "success",

        "message":
            "Amazon Product API is running",

        "product_endpoint":
            "/products?asin=B0DB5ZLDTB",

        "search_endpoint":
            "/search?query=jackets",

    }


@app.get("/health")
def health():
    """Lightweight readiness probe used by the all-in-one launcher."""
    return {
        "status": "ok",
        "service": "backend",
        "recommendations_enabled": True,
    }


@app.get("/products")
def get_product(

    asin: str,

    domain: str = "in",

    geo_location: str = "",

    require_tryon_clothing: bool = False,

):

    asin = asin.strip().upper()

    if not asin:

        raise HTTPException(
            status_code=400,
            detail="ASIN is required."
        )

    if len(asin) != 10:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid ASIN. "
                "ASIN must be exactly 10 characters."
            )
        )

    if not asin.isalnum():

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid ASIN. "
                "Only letters and numbers are allowed."
            )
        )

    if domain not in ALLOWED_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail={
                "error":
                    "Invalid Amazon domain",

                "allowed_domains":
                    sorted(
                        ALLOWED_DOMAINS
                    ),
            }
        )

    _key = _product_key(asin, domain, geo_location)

    _hit = _product_cache.get(_key)
    if _hit is not None:
        _logger.info("[CACHE HIT]  /products  key=%s", _key)
        if is_restricted_intimate_product(_hit):
            raise HTTPException(status_code=404, detail="Product is not available.")
        if require_tryon_clothing and not is_tryon_clothing_product(_hit):
            raise HTTPException(
                status_code=422,
                detail="Please paste a link only for clothes.",
            )
        return JSONResponse(
            content=_hit,
            headers={"Cache-Control": f"private, max-age={_PRODUCT_TTL}"},
        )

    _logger.info("[CACHE MISS] /products  key=%s", _key)

    raw_response = oxylabs_request(

        asin=asin,

        domain=domain,

        geo_location=geo_location,

    )

    content = extract_content(
        raw_response
    )

    if not content:

        raise HTTPException(
            status_code=404,
            detail={
                "error":
                    "Product data not found",

                "asin":
                    asin,
            }
        )

    product = normalize_product(

        content=content,

        asin=asin,

        domain=domain,

        geo_location=geo_location,

    )

    _body = {

        "status":
            "success",

        **product,

    }

    if is_restricted_intimate_product(_body):
        raise HTTPException(status_code=404, detail="Product is not available.")
    if require_tryon_clothing and not is_tryon_clothing_product(_body):
        raise HTTPException(
            status_code=422,
            detail="Please paste a link only for clothes.",
        )

    _product_cache.set(_key, _body, ttl=_PRODUCT_TTL)
    _logger.info("[CACHE SET]  /products  key=%s  (TTL=%ds)", _key, _PRODUCT_TTL)

    return JSONResponse(
        content=_body,
        headers={"Cache-Control": f"private, max-age={_PRODUCT_TTL}"},
    )


@app.get("/products/from-url")
def get_product_from_amazon_url(url: str):
    """Fetch a try-on-eligible Amazon product from its canonical listing URL."""
    try:
        asin, domain = parse_amazon_product_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return get_product(asin=asin, domain=domain, require_tryon_clothing=True)


def search_products_data(
    query: str,
    domain: str = "in",
    geo_location: str = "",
) -> dict:
    """Return the shared, cached search result used by both API routes."""
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")

    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid Amazon domain",
                "allowed_domains": sorted(ALLOWED_DOMAINS),
            },
        )

    key = _search_key(query, domain, geo_location)
    cached = _search_cache.get(key)
    if cached is not None:
        _logger.info("[CACHE HIT] /search key=%s", key)
        cached_products = filter_allowed_products(cached.get("products", []))
        return {
            **cached,
            "count": len(cached_products),
            "products": cached_products,
        }

    _logger.info("[CACHE MISS] /search key=%s", key)
    products, filters = collect_search_products(
        query=query,
        domain=domain,
        geo_location=geo_location,
    )
    products = filter_allowed_products(products)

    body = {
        "status": "success",
        "query": query,
        "count": len(products),
        "filters": filters,
        "products": products,
    }

    if products:
        _search_cache.set(key, body, ttl=_SEARCH_TTL)
        _logger.info("[CACHE SET] /search key=%s (TTL=%ds)", key, _SEARCH_TTL)

    return body


@app.get("/search")
def search_products(
    query: str,
    domain: str = "in",
    geo_location: str = "",
):
    body = search_products_data(query, domain, geo_location)
    if not body["products"]:
        raise HTTPException(
            status_code=404,
            detail={"error": "No products found", "query": body["query"]},
        )

    return JSONResponse(
        content=body,
        headers={"Cache-Control": f"private, max-age={_SEARCH_TTL}"},
    )

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "main:app",

        host="0.0.0.0",

        port=service_port("BACKEND_URL", "http://127.0.0.1:8000"),

        reload=True,

    )
