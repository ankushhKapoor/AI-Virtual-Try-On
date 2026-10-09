"""Lightweight, per-image quality checks for CatVTON outputs.

The normal interactive try-on flow has no ground-truth photograph of the same
person wearing the selected garment. Therefore LPIPS is calculated only when
an explicit reference image is supplied, and FID is calculated only over two
image sets through the benchmark helper. SSIM can compare the source person and
result for change/preservation diagnostics, but is not a realism metric.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity

logger = logging.getLogger(__name__)


def _as_rgb_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGB"), dtype=np.float64) / 255.0


def _masked_ssim(reference: np.ndarray, result: np.ndarray, mask: Image.Image) -> float:
    """Return local-window SSIM averaged outside the generated garment mask."""
    mask_values = np.asarray(mask.convert("L"), dtype=np.float64) / 255.0
    weights = 1.0 - mask_values
    total_weight = float(weights.sum())
    if total_weight < 1.0:
        return 0.0

    _, similarity_map = structural_similarity(
        reference,
        result,
        channel_axis=-1,
        data_range=1.0,
        full=True,
    )
    if similarity_map.ndim == 3:
        similarity_map = similarity_map.mean(axis=2)
    return float(np.clip((similarity_map * weights).sum() / total_weight, 0.0, 1.0))


def _overall_ssim(reference: np.ndarray, result: np.ndarray) -> float:
    """Return local-window SSIM for the complete image."""
    return float(structural_similarity(reference, result, channel_axis=-1, data_range=1.0))


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


def _garment_siglip_similarity(product_image: Image.Image, generated_garment: Image.Image) -> float:
    """FashionSigLIP cosine similarity of the selected garment and output region."""
    # Reuse the existing FashionSigLIP recommendation model and its serialized
    # inference executor. The Model API configures it for CPU to preserve GPU
    # VRAM for CatVTON.
    from backend.recommendation.model import _run_in_executor, get_image_embedding

    def compare() -> float:
        product_embedding = get_image_embedding(product_image)
        output_embedding = get_image_embedding(generated_garment)
        return float((product_embedding * output_embedding).sum().item())

    return float(np.clip(_run_in_executor(compare), -1.0, 1.0))


def _lpips_distance(reference_image: Image.Image, result_image: Image.Image) -> float:
    """Calculate LPIPS against a paired ground-truth try-on reference image."""
    try:
        import lpips
        import torch
    except ImportError as exc:
        raise RuntimeError("LPIPS dependencies are not installed. Run uv sync.") from exc

    reference = _as_rgb_array(reference_image)
    result = _as_rgb_array(result_image)
    reference_tensor = torch.from_numpy(reference.transpose(2, 0, 1)).float().unsqueeze(0) * 2 - 1
    result_tensor = torch.from_numpy(result.transpose(2, 0, 1)).float().unsqueeze(0) * 2 - 1
    model = lpips.LPIPS(net="alex").eval()
    with torch.no_grad():
        return float(model(reference_tensor, result_tensor).item())


def calculate_fid(
    generated_images: list[Image.Image],
    ground_truth_images: list[Image.Image],
) -> float:
    """Calculate dataset-level FID. A single image is not a valid FID sample."""
    if len(generated_images) < 2 or len(ground_truth_images) < 2:
        raise ValueError("FID requires at least two generated and two ground-truth images.")
    try:
        import torch
        from torchmetrics.image.fid import FrechetInceptionDistance
    except ImportError as exc:
        raise RuntimeError("FID dependencies are not installed. Run uv sync.") from exc

    def as_batch(images: list[Image.Image]):
        arrays = [
            np.asarray(image.convert("RGB").resize((299, 299), Image.Resampling.BICUBIC), dtype=np.uint8)
            .transpose(2, 0, 1)
            for image in images
        ]
        return torch.from_numpy(np.stack(arrays))

    # FID is based on Inception features and is meaningful only across image
    # sets. TorchMetrics downloads/caches the Inception weights on first use.
    metric = FrechetInceptionDistance(feature=2048, normalize=False)
    metric.update(as_batch(ground_truth_images), real=True)
    metric.update(as_batch(generated_images), real=False)
    return float(metric.compute().item())


def evaluate_tryon(
    person_image: Image.Image,
    result_image: Image.Image,
    garment_mask: Image.Image,
    cloth_image: Image.Image | None = None,
    ground_truth_image: Image.Image | None = None,
) -> dict[str, Any]:
    """Calculate per-try-on diagnostics without affecting CatVTON inference."""
    # CatVTON can return a final image whose dimensions differ from its
    # preprocessed input (depending on the pipeline's VAE scale/crop). Align
    # both reference inputs to the final result before pixel comparisons.
    if person_image.size != result_image.size:
        person_image = person_image.resize(result_image.size, Image.Resampling.BICUBIC)
    if garment_mask.size != result_image.size:
        garment_mask = garment_mask.resize(result_image.size, Image.Resampling.BILINEAR)
    if ground_truth_image is not None and ground_truth_image.size != result_image.size:
        ground_truth_image = ground_truth_image.resize(result_image.size, Image.Resampling.BICUBIC)

    person = _as_rgb_array(person_image)
    result = _as_rgb_array(result_image)

    metrics = {
        "overall_ssim": round(_overall_ssim(person, result), 4),
        "person_background_ssim": round(_masked_ssim(person, result, garment_mask), 4),
        "person_background_psnr_db": round(_masked_psnr(person, result, garment_mask), 2),
        "lpips": None,
        "lpips_note": "Requires a paired ground-truth try-on reference image.",
        "fid": None,
        "fid_note": "FID is available only for a generated/reference image set, not one try-on.",
        "method": "overall_ssim_masked_ssim_optional_lpips",
    }
    if ground_truth_image is not None:
        try:
            metrics["lpips"] = round(_lpips_distance(ground_truth_image, result_image), 4)
            metrics["lpips_note"] = "LPIPS against the supplied paired ground-truth try-on image; lower is better."
        except Exception as exc:
            logger.exception("LPIPS evaluation failed")
            metrics["lpips_error"] = str(exc)
    if cloth_image is not None:
        try:
            garment_crop = _generated_garment_crop(result_image, garment_mask)
            metrics["garment_siglip_similarity"] = round(
                _garment_siglip_similarity(cloth_image, garment_crop), 4
            )
        except Exception as exc:
            # The semantic model is optional. Its first load/download must not
            # discard preservation metrics or fail a completed try-on.
            logger.exception("FashionSigLIP garment evaluation failed")
            metrics["garment_siglip_error"] = str(exc)
    return metrics
