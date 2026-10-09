"""Regression tests for Amazon link try-on eligibility."""

import pytest

from backend.main import is_tryon_clothing_product, parse_amazon_product_url


@pytest.mark.parametrize(
    ("url", "asin", "domain"),
    [
        ("https://www.amazon.in/dp/B0DB5ZLDTB", "B0DB5ZLDTB", "in"),
        ("https://www.amazon.com/Example-Shirt/dp/B012345678?tag=test", "B012345678", "com"),
        ("https://amazon.co.uk/gp/product/B012345678", "B012345678", "co.uk"),
    ],
)
def test_parses_supported_amazon_product_urls(url, asin, domain):
    assert parse_amazon_product_url(url) == (asin, domain)


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/dp/B012345678",
        "https://www.amazon.in/gp/cart/view.html",
        "https://www.amazon.in/dp/not-an-asin",
    ],
)
def test_rejects_non_product_or_non_amazon_urls(url):
    with pytest.raises(ValueError):
        parse_amazon_product_url(url)


def test_allows_clothing_and_rejects_non_clothing_for_tryon():
    assert is_tryon_clothing_product({"title": "Women's Floral Cotton Kurti Dress"})
    assert is_tryon_clothing_product({"categories": ["Fashion", "Men's Jeans"]})
    assert not is_tryon_clothing_product({"title": "Wireless Bluetooth Headphones"})
    assert not is_tryon_clothing_product({"title": "Women's Cotton Hipster Underwear"})
