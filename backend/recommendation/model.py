"""
backend/recommendation/model.py
---------------------------------
FashionSigLIP singleton model manager.

Loads Marqo FashionSigLIP exactly once (lazy, on first request).
After loading, the model and processor are kept in memory for all subsequent
inference calls.

Device priority:
  XPU (Intel Arc) → CUDA → CPU

CPU fallback is always guaranteed.
"""

from __future__ import annotations

import concurrent.futures
import logging
import os
import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import torch
    from transformers import AutoModel, AutoProcessor

_logger = logging.getLogger(__name__)

_MODEL_NAME = os.getenv("RECOMMENDATION_MODEL", "Marqo/marqo-fashionSigLIP")

# Module-level singletons — populated once by _ensure_loaded()
_model: "AutoModel | None" = None
_processor: "AutoProcessor | None" = None
_device: "torch.device | None" = None
_load_lock = threading.Lock()
_load_failed = False   # Set True if loading fails; stops repeated retries


# ---------------------------------------------------------------------------
# Device detection
# ---------------------------------------------------------------------------

def _detect_device() -> "torch.device":
    import torch

    configured_device = os.getenv(
        "RECOMMENDATION_MODEL_DEVICE",
        os.getenv("FASHION_CLIP_DEVICE", ""),
    ).strip().lower()
    if configured_device == "cpu":
        _logger.info("[RECOMMENDATION] FashionSigLIP device=cpu (configured)")
        return torch.device("cpu")

    # Intel XPU (Arc GPU) — requires intel-extension-for-pytorch
    try:
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            _logger.info("[RECOMMENDATION] FashionCLIP device=xpu")
            return torch.device("xpu")
    except Exception:
        pass

    # NVIDIA CUDA
    try:
        if torch.cuda.is_available():
            _logger.info("[RECOMMENDATION] FashionCLIP device=cuda")
            return torch.device("cuda")
    except Exception:
        pass

    _logger.info("[RECOMMENDATION] FashionCLIP device=cpu")
    return torch.device("cpu")


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _ensure_loaded() -> bool:
    """
    Load the model+processor if not already loaded.
    Returns True on success, False if loading previously failed.
    Thread-safe.
    """
    global _model, _processor, _device, _load_failed

    if _model is not None:
        return True

    if _load_failed:
        return False

    with _load_lock:
        # Double-check inside lock
        if _model is not None:
            return True
        if _load_failed:
            return False

        try:
            _logger.info(
                "[RECOMMENDATION] Loading FashionSigLIP (%s) — first request "
                "(model will be cached by HuggingFace)...",
                _MODEL_NAME,
            )

            import torch
            from transformers import AutoConfig, AutoModel, AutoProcessor

            device = _detect_device()

            processor = AutoProcessor.from_pretrained(_MODEL_NAME, trust_remote_code=True)
            # Marqo's remote wrapper loads its OpenCLIP weights itself from
            # ``open_clip_model_name`` in its constructor. Transformers 5's
            # ``from_pretrained`` creates that custom constructor on the meta
            # device—even with low_cpu_mem_usage=False—then OpenCLIP fails on
            # its internal ``model.to(...)``. Build from the downloaded config
            # instead, which uses normal CPU tensors and still lets Marqo's
            # wrapper load the cached OpenCLIP checkpoint.
            config = AutoConfig.from_pretrained(_MODEL_NAME, trust_remote_code=True)
            model = AutoModel.from_config(config, trust_remote_code=True)
            model.to(device)
            model.eval()

            # --- CRITICAL: prevent PyTorch CPU thread deadlock ---
            # PyTorch spawns OpenMP threads internally. When running inside
            # uvicorn's thread pool, this causes a deadlock that freezes the
            # entire server. Limit PyTorch to 1 CPU thread to avoid this.
            import torch as _torch
            _torch.set_num_threads(1)

            _processor = processor
            _model = model
            _device = device

            _logger.info(
                "[RECOMMENDATION] FashionSigLIP loaded successfully on %s",
                device,
            )
            return True

        except Exception as exc:
            _load_failed = True
            _logger.error(
                "[RECOMMENDATION] Failed to load FashionSigLIP: %s", exc,
                exc_info=True,
            )
            return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# Dedicated single-thread executor for FashionCLIP inference.
# Using exactly 1 thread prevents any PyTorch internal parallelism
# from conflicting with uvicorn's thread pool workers.
_inference_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="fashionclip_",
)


def get_model_and_processor():
    """
    Return (model, processor, device) or raise RuntimeError if unavailable.
    """
    if not _ensure_loaded():
        raise RuntimeError(
            "FashionSigLIP model is not available. "
            "Check logs for the original error."
        )
    return _model, _processor, _device


def is_model_available() -> bool:
    """Return True if the model is loaded and ready (non-blocking check)."""
    return _model is not None


def _run_in_executor(fn, *args):
    """
    Run a callable in the dedicated FashionCLIP executor.
    Blocks the calling thread (safe to call from a uvicorn sync thread pool worker).
    """
    future = _inference_executor.submit(fn, *args)
    return future.result(timeout=120)   # 2-minute hard timeout per call


def get_image_embedding(image):
    """
    Return a normalised image embedding tensor for `image` (PIL.Image).
    Shape: (1, embedding_dim)
    """
    import torch

    model, processor, device = get_model_and_processor()
    inputs = processor(images=[image], return_tensors="pt").to(device)
    with torch.no_grad():
        feats = model.get_image_features(inputs["pixel_values"], normalize=True)
    return feats.cpu()


def get_text_embedding(text: str | list[str]):
    """
    Return a normalised text embedding tensor for `text`.
    Shape: (1, embedding_dim)
    """
    import torch

    model, processor, device = get_model_and_processor()
    texts = [text] if isinstance(text, str) else text
    inputs = processor(text=texts, return_tensors="pt", padding="max_length", truncation=True).to(device)
    with torch.no_grad():
        feats = model.get_text_features(inputs["input_ids"], normalize=True)
    return feats.cpu()
