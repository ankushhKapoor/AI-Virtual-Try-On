from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import os
import re
import requests


load_dotenv()


app = FastAPI(
    title="Amazon Product API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    return {

        "asin": asin,

        "brand":
            product.get("brand")
            or product.get("manufacturer"),

        "title":
            title,

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

    return {

        "status":
            "success",

        **product,

    }


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
            detail="Search query is required."
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
            }
        )

    return {

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


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "main:app",

        host="127.0.0.1",

        port=8000,

        reload=True,

    )