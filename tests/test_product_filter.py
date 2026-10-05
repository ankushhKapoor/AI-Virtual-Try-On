"""Regression tests for server-side product safety filtering."""

from backend.main import filter_allowed_products, is_restricted_intimate_product


def test_filters_common_underwear_titles_from_all_sources():
    products = [
        {"title": "Men's White Round Neck Sleeveless Cotton Vest"},
        {"title": "Women Cotton Hipster (Pack of 3)"},
        {"title": "Women's Cotton Briefs"},
    ]

    assert all(is_restricted_intimate_product(product) for product in products)
    assert filter_allowed_products(products) == []


def test_filters_supportive_compression_innerwear():
    product = {
        "title": (
            "Sightbomb Seamless Ultra Soft Round Neck Double Layer Short Sleeve "
            "Medium Compression Active Wear/Casual Wear Front Support Afford Lux Cuddle Tee"
        ),
    }

    assert is_restricted_intimate_product(product)
    assert filter_allowed_products([product]) == []


def test_keeps_regular_sleeveless_clothing():
    product = {
        "title": "Women's Floral Printed Sleeveless Summer Dress",
        "category": "Dresses",
    }

    assert not is_restricted_intimate_product(product)
    assert filter_allowed_products([product]) == [product]


def test_checks_nested_category_metadata():
    product = {
        "title": "Cotton Everyday Bottom",
        "categories": [{"name": "Women's Hipsters"}],
    }

    assert is_restricted_intimate_product(product)
