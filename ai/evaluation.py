"""Lightweight, per-image quality checks for CatVTON outputs.

The project has no ground-truth photograph of a person wearing the selected
garment, so PSNR, whole-image SSIM, LPIPS, FID, and KID would be misleading.
Instead, SSIM is measured only outside CatVTON's garment mask, where the
person and background should remain unchanged.  The remaining checks are
no-reference output-quality indicators and require no additional model files.
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


def _score_from_variance(variance: float) -> float:
    """Map an unbounded Laplacian variance to an understandable 0–100 score."""
    # 0.0015 is a practical reference point for the 1024px CatVTON output.
    return float(np.clip(100 * (1 - np.exp(-variance / 0.0015)), 0, 100))


def _garment_edit_strength(
    reference: np.ndarray,
    result: np.ndarray,
    mask: Image.Image,
) -> float:
    """Measure the amount of visible change inside CatVTON's edited region."""
    weights = np.asarray(mask.convert("L"), dtype=np.float64) / 255.0
    total_weight = float(weights.sum())
    if total_weight < 1.0:
        return 0.0
    mean_change = float((np.abs(result - reference).mean(axis=2) * weights).sum() / total_weight)
    # This is an integrity signal, not an accuracy claim: 0 means no visible
    # garment edit, while 100 means the intended region changed substantially.
    return float(np.clip(100 * (1 - np.exp(-mean_change / 0.12)), 0, 100))


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

    sharpness_variance = _sharpness_variance(result)

    return {
        "person_background_ssim": round(_masked_ssim(person, result, garment_mask), 4),
        "garment_edit_strength": round(_garment_edit_strength(person, result, garment_mask), 1),
        "detail_quality_score": round(_score_from_variance(sharpness_variance), 1),
        "method": "masked_ssim_and_no_reference_integrity_checks",
    }
