from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv

import logging
import os
import re
import requests
import threading
import time

from pathlib import Path
import sys

_backend_dir = str(Path(__file__).resolve().parent)
_project_root = str(Path(__file__).resolve().parent.parent)

if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

# Load backend/.env first, then root .env as fallback
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv()


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
    In-memory cache with per-entry TTL and bounded capacity.

    Expired entries are lazily evicted on get().
    When maxsize is reached, the entry whose TTL expires soonest
    is evicted to make room.

    All methods are protected by a threading.Lock.
    """

    def __init__(
        self,
        maxsize: int = 512,
        default_ttl: float = 3600,
    ):
        self._store: dict = {}
        self._lock = threading.Lock()
        self._maxsize = maxsize
        self._default_ttl = default_ttl

    def get(self, key: str):
        """Return cached value or None if absent / expired."""

        with self._lock:
            entry = self._store.get(key)

            if entry is None:
                return None

            value, expires_at = entry

            if time.monotonic() > expires_at:
                del self._store[key]
                return None

            return value

    def set(
        self,
        key: str,
        value,
        ttl: float | None = None,
    ):
        """Store value with given TTL in seconds."""

        if ttl is None:
            ttl = self._default_ttl

        with self._lock:

            if (
                key not in self._store
                and len(self._store) >= self._maxsize
            ):
                oldest = min(
                    self._store,
                    key=lambda k: self._store[k][1],
                )

                del self._store[oldest]

            self._store[key] = (
                value,
                time.monotonic() + ttl,
            )


# ---------------------------------------------------------------------------
# Cache instances
# ---------------------------------------------------------------------------

_product_cache = _TTLCache(
    maxsize=512,
    default_ttl=3600,
)

_search_cache = _TTLCache(
    maxsize=256,
    default_ttl=1800,
)

_PRODUCT_TTL = 3600
_SEARCH_TTL = 1800


# ---------------------------------------------------------------------------
# Cache key helpers
# ---------------------------------------------------------------------------

def _product_key(
    asin: str,
    domain: str,
    geo_location: str,
) -> str:

    return (
        f"product:"
        f"{asin.strip().upper()}:"
        f"{domain.strip().lower()}:"
        f"{geo_location.strip().lower()}"
    )


def _search_key(
    query: str,
    domain: str,
    geo_location: str,
) -> str:

    q = re.sub(
        r"\s+",
        " ",
        query.strip().lower(),
    )

    return (
        f"search:"
        f"{q}:"
        f"{domain.strip().lower()}:"
        f"{geo_location.strip().lower()}"
    )


# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Amazon Product API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.206:5173",

        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://192.168.0.206:5174",

        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://192.168.0.206:5175",

        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.0.206:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Recommendation router
# ---------------------------------------------------------------------------

from recommendation.router import router as _recommendation_router

app.include_router(_recommendation_router)


# ---------------------------------------------------------------------------
# Auth, User, Admin routers & Database Init
# ---------------------------------------------------------------------------

_project_root = str(
    Path(__file__).resolve().parent.parent
)

if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

try:

    from app.routes.auth import router as _auth_router
    from app.routes.users import router as _users_router
    from app.routes.admin import router as _admin_router
    from app.database.connection import (
        create_all_tables as _create_all_tables
    )

    app.include_router(_auth_router)
    app.include_router(_users_router)
    app.include_router(_admin_router)

    _create_all_tables()

    _logger.info(
        "Auth, user, and admin routes loaded successfully."
    )

except Exception as _e:

    _logger.warning(
        "Could not initialize auth/admin routes: %s",
        _e,
    )


# ---------------------------------------------------------------------------
# Oxylabs configuration
# ---------------------------------------------------------------------------

OXYLABS_URL = (
    "https://realtime.oxylabs.io/v1/queries"
)

OXYLABS_USERNAME = os.getenv(
    "OXYLABS_USERNAME"
)

OXYLABS_PASSWORD = os.getenv(
    "OXYLABS_PASSWORD"
)


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


# ---------------------------------------------------------------------------
# Amazon image proxy configuration
# ---------------------------------------------------------------------------

"""
Amazon product images are normally hosted on Amazon's image/CDN
domains.

The frontend should not directly depend on those URLs.

Instead:

    React
       |
       v
    /image-proxy?url=<amazon-image-url>
       |
       v
    FastAPI
       |
       v
    Amazon image CDN
       |
       v
    image bytes
       |
       v
    React

The allowlist is intentional so this endpoint cannot be used as
an arbitrary external URL proxy.
"""

AMAZON_IMAGE_HOSTS = {
    "m.media-amazon.com",
    "images-na.ssl-images-amazon.com",
    "images-eu.ssl-images-amazon.com",
    "images-fe.ssl-images-amazon.com",
    "images-cn.ssl-images-amazon.com",
    "images.amazon.com",
}


def is_allowed_amazon_image_url(
    url: str,
) -> bool:
    """
    Return True only for HTTPS URLs belonging to
    known Amazon image/CDN hosts.
    """

    from urllib.parse import urlparse

    try:

        parsed = urlparse(url)

        if parsed.scheme != "https":
            return False

        hostname = (
            parsed.hostname or ""
        ).lower()

        return hostname in AMAZON_IMAGE_HOSTS

    except Exception:

        return False


@app.get("/image-proxy")
def image_proxy(
    url: str,
):
    """
    Proxy an Amazon product image through FastAPI.

    Example:

        /image-proxy?url=https%3A%2F%2Fm.media-amazon.com%2F...

    The backend downloads the image from Amazon and returns
    the image bytes to the frontend.
    """

    if not url:

        raise HTTPException(
            status_code=400,
            detail="Image URL is required.",
        )

    from urllib.parse import unquote

    url = unquote(url).strip()

    if not is_allowed_amazon_image_url(url):

        raise HTTPException(
            status_code=400,
            detail=(
                "Only supported Amazon image URLs "
                "are allowed."
            ),
        )

    try:

        response = requests.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/140.0 Safari/537.36"
                ),
                "Accept": (
                    "image/avif,image/webp,image/apng,"
                    "image/svg+xml,image/*,*/*;q=0.8"
                ),
                "Referer": "https://www.amazon.in/",
            },
            timeout=(10, 30),
            stream=True,
        )

    except requests.exceptions.Timeout:

        raise HTTPException(
            status_code=504,
            detail=(
                "Amazon image request timed out."
            ),
        )

    except requests.exceptions.RequestException as exc:

        _logger.warning(
            "Amazon image proxy request failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve Amazon image."
            ),
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=502,
            detail=(
                "Amazon image server returned "
                f"HTTP {response.status_code}."
            ),
        )

    content_type = (
        response.headers.get(
            "content-type"
        )
        or "image/jpeg"
    )

    if not content_type.lower().startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=502,
            detail=(
                "Amazon returned a non-image "
                "response."
            ),
        )

    return StreamingResponse(
        response.raw,
        media_type=content_type.split(";")[0],
        headers={
            "Cache-Control": (
                "public, max-age=86400"
            ),
        },
    )


# ---------------------------------------------------------------------------
# URL cleaning
# ---------------------------------------------------------------------------

def clean_url(value):

    if not value:
        return None

    value = str(value)

    value = value.replace(
        "\\_",
        "_",
    )

    value = value.replace(
        "\\/",
        "/",
    )

    value = value.replace(
        "\\.",
        ".",
    )

    value = value.replace(
        "\\-",
        "-",
    )

    value = value.replace(
        "\\",
        "",
    )

    markdown_match = re.search(
        r"\]\(\s*(https?://[^)\s]+)\s*\)",
        value,
    )

    if markdown_match:

        return markdown_match.group(
            1
        ).strip()

    url_match = re.search(
        r"https?://[^\s\]\)]+",
        value,
    )

    if url_match:

        return url_match.group(
            0
        ).strip()

    return None


def clean_images(raw_images):

    if not raw_images:
        return []

    if isinstance(
        raw_images,
        str,
    ):
        raw_images = [
            raw_images
        ]

    if not isinstance(
        raw_images,
        list,
    ):
        return []

    images = []
    seen = set()

    for item in raw_images:

        url = clean_url(item)

        if not url:
            continue

        url = url.rstrip(
            ".,;)"
        )

        if not url.startswith(
            "http"
        ):
            continue

        if url in seen:
            continue

        seen.add(url)

        images.append(url)

    return images


# ---------------------------------------------------------------------------
# Oxylabs product request
# ---------------------------------------------------------------------------

def oxylabs_request(
    asin,
    domain="in",
    geo_location="",
):

    if (
        not OXYLABS_USERNAME
        or not OXYLABS_PASSWORD
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs username/password "
                "missing in .env"
            ),
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
            detail=(
                "Oxylabs product request "
                "timed out."
            ),
        )

    except requests.exceptions.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs product request "
                f"failed: {str(e)}"
            ),
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Oxylabs returned an error"
                ),
                "status_code":
                    response.status_code,
                "response":
                    response.text[:2000],
            },
        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs returned invalid JSON."
            ),
        )


# ---------------------------------------------------------------------------
# Oxylabs search request
# ---------------------------------------------------------------------------

def oxylabs_search_request(
    query,
    domain="in",
    geo_location="",
    start_page=1,
    pages=1,
    sort_by="featured",
):

    if (
        not OXYLABS_USERNAME
        or not OXYLABS_PASSWORD
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs username/password "
                "missing in .env"
            ),
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
            detail=(
                "Oxylabs search request timed "
                "out."
            ),
        )

    except requests.exceptions.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs search request "
                f"failed: {str(e)}"
            ),
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Oxylabs returned an error"
                ),
                "status_code":
                    response.status_code,
                "response":
                    response.text[:2000],
            },
        )

    try:

        return response.json()

    except Exception:

        raise HTTPException(
            status_code=500,
            detail=(
                "Oxylabs returned invalid JSON."
            ),
        )


# ---------------------------------------------------------------------------
# Oxylabs response extraction
# ---------------------------------------------------------------------------

def extract_content(data):

    if not isinstance(
        data,
        dict,
    ):
        return {}

    results = data.get(
        "results"
    )

    if isinstance(
        results,
        list,
    ):

        for result in results:

            if not isinstance(
                result,
                dict,
            ):
                continue

            content = result.get(
                "content"
            )

            if isinstance(
                content,
                dict,
            ):
                return content

    content = data.get(
        "content"
    )

    if isinstance(
        content,
        dict,
    ):
        return content

    return {}


def extract_search_contents(data):

    if not isinstance(
        data,
        dict,
    ):
        return []

    results = data.get(
        "results"
    )

    if not isinstance(
        results,
        list,
    ):
        return []

    contents = []

    for result in results:

        if not isinstance(
            result,
            dict,
        ):
            continue

        content = result.get(
            "content"
        )

        if isinstance(
            content,
            dict,
        ):
            contents.append(
                content
            )

    return contents


# ---------------------------------------------------------------------------
# Search refinements
# ---------------------------------------------------------------------------

def get_refinement_groups(
    content,
):

    refinements = content.get(
        "refinements",
        {},
    )

    if not isinstance(
        refinements,
        dict,
    ):
        return {}

    return refinements


def extract_refinement_values(
    refinements,
    possible_keys,
):

    values = []
    seen = set()

    for key in possible_keys:

        items = refinements.get(
            key,
            [],
        )

        if not isinstance(
            items,
            list,
        ):
            continue

        for item in items:

            if not isinstance(
                item,
                dict,
            ):
                continue

            name = item.get(
                "name"
            )

            if not name:
                continue

            name = str(
                name
            ).strip()

            if not name:
                continue

            name = re.sub(
                r"^Apply\s+",
                "",
                name,
                flags=re.IGNORECASE,
            )

            name = re.sub(
                r"\s+filter\s+to\s+narrow\s+results$",
                "",
                name,
                flags=re.IGNORECASE,
            )

            name = name.strip()

            if not name:
                continue

            normalized = name.lower()

            if normalized in seen:
                continue

            seen.add(
                normalized
            )

            values.append(
                name
            )

    return values


def collect_search_facets(
    contents,
):

    gender = set()
    colors = set()
    sizes = set()

    for content in contents:

        refinements = (
            get_refinement_groups(
                content
            )
        )

        gender_values = (
            extract_refinement_values(
                refinements,
                [
                    "gender",
                    "department",
                ],
            )
        )

        color_values = (
            extract_refinement_values(
                refinements,
                [
                    "color",
                    "colors",
                ],
            )
        )

        size_values = (
            extract_refinement_values(
                refinements,
                [
                    "mens_clothing_size",
                    "womens_clothing_size",
                    "clothing_size",
                    "size",
                    "size_name",
                ],
            )
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
            key=str.lower,
        ),
        "color": sorted(
            colors,
            key=str.lower,
        ),
        "size": sorted(
            sizes,
            key=str.lower,
        ),
    }


# ---------------------------------------------------------------------------
# Search product normalization
# ---------------------------------------------------------------------------

def normalize_search_product(
    product,
    domain,
):

    if not isinstance(
        product,
        dict,
    ):
        return None

    asin = product.get(
        "asin"
    )

    title = product.get(
        "title"
    )

    if not asin or not title:
        return None

    relative_url = product.get(
        "url"
    )

    if relative_url:

        if relative_url.startswith(
            "/"
        ):

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
            product.get(
                "url_image"
            )
        )
        or clean_url(
            product.get(
                "image"
            )
        )
    )

    price = product.get(
        "price"
    )

    try:

        numeric_price = (
            float(price)
            if price is not None
            else None
        )

    except (
        ValueError,
        TypeError,
    ):

        numeric_price = None

    image_proxy = None

    if image:

        from urllib.parse import quote

        image_proxy = (
            "/image-proxy?url="
            + quote(
                image,
                safe="",
            )
        )

    return {

        "asin":
            asin,

        "brand":
            product.get(
                "brand"
            )
            or product.get(
                "manufacturer"
            ),

        "title":
            title,

        "price":
            numeric_price,

        "currency":
            product.get(
                "currency",
                "INR",
            ),

        "rating":
            product.get(
                "rating"
            ),

        "reviews_count":
            product.get(
                "reviews_count"
            ),

        "image":
            image,

        "image_proxy":
            image_proxy,

        "images":
            [image] if image else [],

        "image_proxies":
            [image_proxy]
            if image_proxy
            else [],

        "url":
            product_url,

        "is_sponsored":
            product.get(
                "is_sponsored",
                False,
            ),

        "is_prime":
            product.get(
                "is_prime",
                False,
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


# ---------------------------------------------------------------------------
# Collect Amazon search products
# ---------------------------------------------------------------------------

def collect_search_products(
    query,
    domain,
    geo_location,
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

            raw_response = (
                oxylabs_search_request(
                    query=search_query,
                    domain=domain,
                    geo_location=geo_location,
                    start_page=1,
                    pages=1,
                    sort_by=sort_mode,
                )
            )

            contents = (
                extract_search_contents(
                    raw_response
                )
            )

            all_contents.extend(
                contents
            )

            for content in contents:

                results = content.get(
                    "results",
                    {},
                )

                if not isinstance(
                    results,
                    dict,
                ):
                    continue

                organic_products = (
                    results.get(
                        "organic",
                        [],
                    )
                )

                if not isinstance(
                    organic_products,
                    list,
                ):
                    continue

                for product in organic_products:

                    normalized = (
                        normalize_search_product(
                            product,
                            domain,
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
        facets,
    )


# ---------------------------------------------------------------------------
# Product normalization
# ---------------------------------------------------------------------------

def normalize_product(
    content,
    asin,
    domain,
    geo_location,
):

    if not isinstance(
        content,
        dict,
    ):
        content = {}

    images = clean_images(
        content.get(
            "images",
            [],
        )
    )

    # Some Oxylabs responses may expose only a single image
    # instead of an images array.
    if not images:

        fallback_images = clean_images(
            [
                content.get(
                    "image"
                ),
                content.get(
                    "url_image"
                ),
            ]
        )

        images = fallback_images

    main_image = (
        images[0]
        if images
        else None
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
        "INR",
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
                    2,
                )

        except (
            ValueError,
            TypeError,
        ):

            price_inr = None

    from urllib.parse import quote

    image_proxy = None

    if main_image:

        image_proxy = (
            "/image-proxy?url="
            + quote(
                main_image,
                safe="",
            )
        )

    image_proxies = []

    for image in images:

        image_proxies.append(
            "/image-proxy?url="
            + quote(
                image,
                safe="",
            )
        )

    return {

        "asin":
            content.get(
                "asin"
            )
            or asin,

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

        "image_proxy":
            image_proxy,

        "images":
            images,

        "image_proxies":
            image_proxies,

        "categories":
            content.get(
                "categories",
                [],
            ),

        "category_path":
            content.get(
                "category_path",
                [],
            ),

        "buybox":
            content.get(
                "buybox",
                [],
            ),

        "product_overview":
            content.get(
                "product_overview",
                [],
            ),

        "amazon_domain":
            domain,

        "geo_location":
            geo_location,
    }


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------

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

        "image_proxy_endpoint":
            "/image-proxy?url=<amazon-image-url>",
    }


# ---------------------------------------------------------------------------
# Product endpoint
# ---------------------------------------------------------------------------

@app.get("/products")
def get_product(

    asin: str,

    domain: str = "in",

    geo_location: str = "",

):

    asin = asin.strip().upper()

    if not asin:

        raise HTTPException(
            status_code=400,
            detail="ASIN is required.",
        )

    if len(asin) != 10:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid ASIN. "
                "ASIN must be exactly 10 characters."
            ),
        )

    if not asin.isalnum():

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid ASIN. "
                "Only letters and numbers are allowed."
            ),
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
            },
        )

    _key = _product_key(
        asin,
        domain,
        geo_location,
    )

    _hit = _product_cache.get(
        _key
    )

    if _hit is not None:

        _logger.info(
            "[CACHE HIT]  /products  key=%s",
            _key,
        )

        return JSONResponse(
            content=_hit,
            headers={
                "Cache-Control":
                    f"private, max-age={_PRODUCT_TTL}",
            },
        )

    _logger.info(
        "[CACHE MISS] /products  key=%s",
        _key,
    )

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
            },
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

    _product_cache.set(
        _key,
        _body,
        ttl=_PRODUCT_TTL,
    )

    _logger.info(
        "[CACHE SET]  /products  key=%s  (TTL=%ds)",
        _key,
        _PRODUCT_TTL,
    )

    return JSONResponse(
        content=_body,
        headers={
            "Cache-Control":
                f"private, max-age={_PRODUCT_TTL}",
        },
    )


# ---------------------------------------------------------------------------
# Search endpoint
# ---------------------------------------------------------------------------

@app.get("/search")
def search_products(

    query: str,

    domain: str = "in",

    geo_location: str = "",

):

    query = query.strip()

    if not query:

        raise HTTPException(
            status_code=400,
            detail="Search query is required.",
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
            },
        )

    _key = _search_key(
        query,
        domain,
        geo_location,
    )

    _hit = _search_cache.get(
        _key
    )

    if _hit is not None:

        _logger.info(
            "[CACHE HIT]  /search  key=%s",
            _key,
        )

        return JSONResponse(
            content=_hit,
            headers={
                "Cache-Control":
                    f"private, max-age={_SEARCH_TTL}",
            },
        )

    _logger.info(
        "[CACHE MISS] /search  key=%s",
        _key,
    )

    products, filters = (
        collect_search_products(

            query=query,

            domain=domain,

            geo_location=geo_location,

        )
    )

    if not products:

        raise HTTPException(
            status_code=404,
            detail={
                "error":
                    "No products found",

                "query":
                    query,
            },
        )

    _body = {

        "status":
            "success",

        "query":
            query,

        "count":
            len(products),

        "filters":
            filters,

        "products":
            products,

    }

    _search_cache.set(
        _key,
        _body,
        ttl=_SEARCH_TTL,
    )

    _logger.info(
        "[CACHE SET]  /search  key=%s  (TTL=%ds)",
        _key,
        _SEARCH_TTL,
    )

    return JSONResponse(
        content=_body,
        headers={
            "Cache-Control":
                f"private, max-age={_SEARCH_TTL}",
        },
    )


# ---------------------------------------------------------------------------
# Development server
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "main:app",

        host="127.0.0.1",

        port=8000,

        reload=True,

    )