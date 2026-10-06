"""Lightweight, per-image quality checks for CatVTON outputs.

The project has no ground-truth photograph of a person wearing the selected
garment, so PSNR, whole-image SSIM, LPIPS, FID, and KID would be misleading.
Instead, SSIM is measured only outside CatVTON's garment mask, where the
person and background should remain unchanged.  The remaining checks are
no-reference output-quality indicators and require no additional model files.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from PIL import Image


def _as_rgb_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGB"), dtype=np.float64) / 255.0


def _masked_ssim(reference: np.ndarray, result: np.ndarray, mask: Image.Image) -> float:
    """Return global SSIM over the area *outside* the generated garment mask."""
    mask_values = np.asarray(mask.convert("L"), dtype=np.float64) / 255.0
    weights = 1.0 - mask_values
    total_weight = float(weights.sum())
    if total_weight < 1.0:
        return 0.0

    weights = weights[..., np.newaxis]
    mean_ref = (reference * weights).sum(axis=(0, 1)) / total_weight
    mean_result = (result * weights).sum(axis=(0, 1)) / total_weight
    ref_delta = reference - mean_ref
    result_delta = result - mean_result
    variance_ref = (weights * ref_delta**2).sum(axis=(0, 1)) / total_weight
    variance_result = (weights * result_delta**2).sum(axis=(0, 1)) / total_weight
    covariance = (weights * ref_delta * result_delta).sum(axis=(0, 1)) / total_weight

    # Standard SSIM constants for images in the [0, 1] range.
    c1, c2 = 0.01**2, 0.03**2
    score = ((2 * mean_ref * mean_result + c1) * (2 * covariance + c2)) / (
        (mean_ref**2 + mean_result**2 + c1) * (variance_ref + variance_result + c2)
    )
    return float(np.clip(score.mean(), 0.0, 1.0))


def _sharpness_variance(rgb: np.ndarray) -> float:
    """Variance of a simple luminance Laplacian; higher generally means sharper."""
    luminance = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    center = luminance[1:-1, 1:-1]
    if center.size == 0:
        return 0.0
    laplacian = (
        luminance[:-2, 1:-1]
        + luminance[2:, 1:-1]
        + luminance[1:-1, :-2]
        + luminance[1:-1, 2:]
        - 4 * center
    )
    return float(laplacian.var())


def evaluate_tryon(
    person_image: Image.Image,
    result_image: Image.Image,
    garment_mask: Image.Image,
) -> dict[str, Any]:
    """Calculate honest per-try-on metrics without loading another ML model."""
    person = _as_rgb_array(person_image)
    result = _as_rgb_array(result_image)
    if person.shape != result.shape:
        raise ValueError("Person and result images must have identical dimensions.")

    # Pixels close to absolute black/white often indicate clipped detail.
    luminance = result[..., 0] * 0.299 + result[..., 1] * 0.587 + result[..., 2] * 0.114
    exposure_balance = float(np.mean((luminance > 0.02) & (luminance < 0.98)))

    return {
        "person_background_ssim": round(_masked_ssim(person, result, garment_mask), 4),
        "output_sharpness": round(_sharpness_variance(result), 6),
        "exposure_balance": round(exposure_balance, 4),
        "method": "masked_ssim_and_no_reference_quality",
    }
