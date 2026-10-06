"""Lightweight, per-image quality checks for CatVTON outputs.

The project has no ground-truth photograph of a person wearing the selected
garment, so whole-image PSNR/SSIM, LPIPS, FID, and KID would be misleading.
Instead, PSNR and SSIM are measured only outside CatVTON's garment mask,
where the person and background should remain unchanged.
"""

from __future__ import annotations

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


def _masked_psnr(reference: np.ndarray, result: np.ndarray, mask: Image.Image) -> float:
    """Return PSNR (dB) outside the generated garment mask."""
    weights = 1.0 - np.asarray(mask.convert("L"), dtype=np.float64) / 255.0
    total_weight = float(weights.sum())
    if total_weight < 1.0:
        return 0.0
    mse = float((((reference - result) ** 2 * weights[..., np.newaxis]).sum()) / (total_weight * 3))
    # A perfect copy has infinite PSNR. Cap its display value for a stable API.
    return 99.0 if mse <= 1e-12 else float(min(99.0, 10 * np.log10(1.0 / mse)))


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

    return {
        "person_background_ssim": round(_masked_ssim(person, result, garment_mask), 4),
        "person_background_psnr_db": round(_masked_psnr(person, result, garment_mask), 2),
        "method": "masked_psnr_and_ssim",
    }
