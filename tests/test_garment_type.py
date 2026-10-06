"""Regression checks for CatVTON garment-mask selection."""

import unittest

from ai.garment_type import detect_garment_type


class GarmentTypeTests(unittest.TestCase):
    def test_catalog_garment_types(self):
        cases = [
        ("Women Pleated Midi Skirt", "lower"),
        ("Women Cotton Top", "upper"),
        ("Women Floral Maxi Dress", "overall"),
        ("Men Oxford Formal Shirt", "upper"),
        ("Men Blue Denim Jeans", "lower"),
        ("Men Cotton Chino Shorts", "lower"),
        ("Men Slim Fit Trackpants", "lower"),
        ("Men Cotton Pyjamas", "lower"),
        ("Men Linen Blazer", "upper"),
        ("Men Casual Jacket", "upper"),
        ("Women Straight Kurta", "upper"),
        ("Women Printed Kurti", "upper"),
        ("Women Kurta with Pyjama", "overall"),
        ("Women Kurti Palazzo Set", "overall"),
        ("Palazo Pants with Kurta", "overall"),
        ("Embroidered Kurta and Churidar", "overall"),
        ("Festive Kurti Sharara Set", "overall"),
        ("Women Anarkali Suit", "overall"),
        ]
        for title, expected in cases:
            with self.subTest(title=title):
                self.assertEqual(detect_garment_type(title), expected)
