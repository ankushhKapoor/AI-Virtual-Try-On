"""Lightweight, per-image quality checks for CatVTON outputs.

The project has no ground-truth photograph of a person wearing the selected
garment, so whole-image PSNR/SSIM, LPIPS, FID, and KID would be misleading.
PSNR and SSIM are measured only outside CatVTON's garment mask, where the
person and background should remain unchanged. They are retained as diagnostics,
not presented as an output-quality grade. FashionSigLIP evaluates product
appearance alignment and an explicitly-labelled fit/placement plausibility
estimate; neither can replace a human review or ground-truth try-on photo.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


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


def _generated_garment_crop(result_image: Image.Image, garment_mask: Image.Image) -> Image.Image:
    """Extract CatVTON's edited garment region on a neutral background."""
    mask = garment_mask.convert("L")
    bounding_box = mask.getbbox()
    if bounding_box is None:
        raise ValueError("CatVTON returned an empty garment mask.")

    # Keep a small amount of context at the edge, but remove the person and
    # background from the semantic comparison.
    left, top, right, bottom = bounding_box
    padding = max(8, round(max(result_image.size) * 0.02))
    crop_box = (
        max(0, left - padding), max(0, top - padding),
        min(result_image.width, right + padding), min(result_image.height, bottom + padding),
    )
    white_background = Image.new("RGB", result_image.size, "white")
    white_background.paste(result_image.convert("RGB"), mask=mask)
    return white_background.crop(crop_box)


def _garment_visual_similarity(
    product_image: Image.Image,
    generated_garment: Image.Image,
) -> tuple[float, float, float]:
    """Compare garment semantics, palette, and fine-detail distribution.

    Product listings often have a different pose/background from the generated
    look, so this is an appearance-alignment estimate rather than pixel truth.
    """
    product = _as_rgb_array(product_image)
    generated = _as_rgb_array(generated_garment)

    def signature(image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        # Ignore near-white listing/crop background where possible. This makes
        # the lightweight palette/detail checks focus on the garment itself.
        saturation = image.max(axis=2) - image.min(axis=2)
        foreground = (image.min(axis=2) < 0.94) | (saturation > 0.08)
        if int(foreground.sum()) < 128:
            foreground = np.ones(image.shape[:2], dtype=bool)
        pixels = image[foreground]
        colour = np.concatenate([
            np.histogram(pixels[:, channel], bins=16, range=(0, 1), density=False)[0]
            for channel in range(3)
        ]).astype(np.float64)
        colour /= max(float(colour.sum()), 1.0)

        grey = image.mean(axis=2)
        gradient_y, gradient_x = np.gradient(grey)
        magnitude = np.hypot(gradient_x, gradient_y)[foreground]
        detail = np.histogram(np.clip(magnitude, 0, 0.5), bins=16, range=(0, 0.5))[0]
        detail = detail.astype(np.float64)
        detail /= max(float(detail.sum()), 1.0)
        return colour, detail

    product_colour, product_detail = signature(product)
    generated_colour, generated_detail = signature(generated)
    palette_match = float(np.minimum(product_colour, generated_colour).sum())
    detail_match = float(np.minimum(product_detail, generated_detail).sum())

    # Reuse the existing FashionSigLIP recommendation model and its serialized
    # inference executor. The Model API configures it for CPU to preserve GPU
    # VRAM for CatVTON.
    from backend.recommendation.model import _run_in_executor, get_image_embedding

    def compare() -> float:
        product_embedding = get_image_embedding(product_image)
        output_embedding = get_image_embedding(generated_garment)
        return float((product_embedding * output_embedding).sum().item())

    semantic = float(np.clip(_run_in_executor(compare), -1.0, 1.0))
    # Semantic agreement is useful for garment type/pattern; palette and
    # detail-distribution terms make texture/colour loss affect the estimate.
    visual_match = 0.55 * semantic + 0.30 * palette_match + 0.15 * detail_match
    return float(np.clip(visual_match, 0.0, 1.0)), palette_match, detail_match


def _fit_placement_plausibility(result_image: Image.Image) -> float:
    """Zero-shot FashionSigLIP estimate of natural garment fit and placement."""
    from backend.recommendation.model import (
        _run_in_executor,
        get_image_embedding,
        get_text_embedding,
    )

    positive_prompt = "a realistic fashion photo of a person wearing a naturally fitted garment"
    negative_prompts = (
        "a person wearing warped and distorted clothing",
        "a garment floating away from the person's body",
        "a badly placed and ill-fitting garment on a person",
    )

    def compare() -> float:
        image_embedding = get_image_embedding(result_image)
        text_embeddings = get_text_embedding([positive_prompt, *negative_prompts])
        similarities = (image_embedding * text_embeddings).sum(dim=1).numpy()
        # Convert the positive-vs-negative margin into a bounded, readable
        # estimate. Temperature prevents tiny cosine differences looking like
        # certainty while still separating clearly implausible outputs.
        logits = np.asarray(similarities, dtype=np.float64) * 8.0
        probabilities = np.exp(logits - logits.max())
        return float(probabilities[0] / probabilities.sum())

    return float(np.clip(_run_in_executor(compare), 0.0, 1.0))


def evaluate_tryon(
    person_image: Image.Image,
    result_image: Image.Image,
    garment_mask: Image.Image,
    cloth_image: Image.Image | None = None,
) -> dict[str, Any]:
    """Calculate honest per-try-on metrics without loading another ML model."""
    # CatVTON can return a final image whose dimensions differ from its
    # preprocessed input (depending on the pipeline's VAE scale/crop). Align
    # both reference inputs to the final result before pixel comparisons.
    if person_image.size != result_image.size:
        person_image = person_image.resize(result_image.size, Image.Resampling.BICUBIC)
    if garment_mask.size != result_image.size:
        garment_mask = garment_mask.resize(result_image.size, Image.Resampling.BILINEAR)

    person = _as_rgb_array(person_image)
    result = _as_rgb_array(result_image)

    metrics = {
        "person_background_ssim": round(_masked_ssim(person, result, garment_mask), 4),
        "person_background_psnr_db": round(_masked_psnr(person, result, garment_mask), 2),
        "method": "masked_diagnostics_fashionsiglip_visual_fit_estimate",
    }
    if cloth_image is not None:
        try:
            garment_crop = _generated_garment_crop(result_image, garment_mask)
            garment_match, palette_match, detail_match = _garment_visual_similarity(
                cloth_image, garment_crop
            )
            metrics["garment_visual_match"] = round(garment_match, 4)
            metrics["garment_palette_match"] = round(palette_match, 4)
            metrics["garment_detail_match"] = round(detail_match, 4)
            metrics["fit_placement_plausibility"] = round(
                _fit_placement_plausibility(result_image), 4
            )
        except Exception as exc:
            # The semantic model is optional. Its first load/download must not
            # discard preservation metrics or fail a completed try-on.
            logger.exception("FashionSigLIP garment evaluation failed")
            metrics["garment_siglip_error"] = str(exc)
    return metrics
