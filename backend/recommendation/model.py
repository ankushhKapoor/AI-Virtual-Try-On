"""
backend/recommendation/model.py

FashionCLIP singleton model manager.

Responsibilities:
- Load FashionCLIP exactly once.
- Detect Intel XPU -> CUDA -> CPU.
- Provide safe single/batch image and text embeddings.
- Keep inference serialized through one dedicated executor.

The recommendation system uses FashionCLIP as a semantic signal,
not as the only outfit-compatibility mechanism.
"""

from __future__ import annotations

import concurrent.futures
import logging
import threading
from typing import TYPE_CHECKING, Sequence

if TYPE_CHECKING:
    import torch
    from PIL import Image
    from transformers import CLIPModel, CLIPProcessor

_logger = logging.getLogger(__name__)

_MODEL_NAME = "patrickjohncyh/fashion-clip"

_model: "CLIPModel | None" = None
_processor: "CLIPProcessor | None" = None
_device: "torch.device | None" = None

_load_lock = threading.Lock()
_load_failed = False

_inference_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="fashionclip_",
)


# ---------------------------------------------------------------------------
# Device detection
# ---------------------------------------------------------------------------

def _detect_device() -> "torch.device":
    import torch

    try:
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            _logger.info("[RECOMMENDATION] FashionCLIP device=xpu")
            return torch.device("xpu")
    except Exception:
        pass

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
    global _model, _processor, _device, _load_failed

    if _model is not None:
        return True

    if _load_failed:
        return False

    with _load_lock:
        if _model is not None:
            return True

        if _load_failed:
            return False

        try:
            _logger.info(
                "[RECOMMENDATION] Loading FashionCLIP (%s)...",
                _MODEL_NAME,
            )

            import torch
            from transformers import CLIPModel, CLIPProcessor

            device = _detect_device()

            processor = CLIPProcessor.from_pretrained(
                _MODEL_NAME,
                clean_up_tokenization_spaces=True,
            )

            model = CLIPModel.from_pretrained(_MODEL_NAME)

            model.to(device)
            model.eval()

            # Avoid excessive CPU threading / uvicorn interaction.
            torch.set_num_threads(1)

            _processor = processor
            _model = model
            _device = device

            _logger.info(
                "[RECOMMENDATION] FashionCLIP loaded successfully on %s",
                device,
            )

            return True

        except Exception as exc:
            _load_failed = True

            _logger.error(
                "[RECOMMENDATION] FashionCLIP failed to load: %s",
                exc,
                exc_info=True,
            )

            return False


# ---------------------------------------------------------------------------
# Public model access
# ---------------------------------------------------------------------------

def get_model_and_processor():
    if not _ensure_loaded():
        raise RuntimeError(
            "FashionCLIP model is not available. "
            "Check backend logs for the original error."
        )

    return _model, _processor, _device


def is_model_available() -> bool:
    return _model is not None


# ---------------------------------------------------------------------------
# Executor
# ---------------------------------------------------------------------------

def _run_in_executor(fn, *args):
    future = _inference_executor.submit(fn, *args)
    return future.result(timeout=120)


# ---------------------------------------------------------------------------
# Internal embedding implementations
# ---------------------------------------------------------------------------

def _image_embeddings_impl(images):
    import torch

    model, processor, device = get_model_and_processor()

    inputs = processor(
        images=list(images),
        return_tensors="pt",
    ).to(device)

    with torch.inference_mode():
        features = model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)

    return features.cpu()


def _text_embeddings_impl(texts):
    import torch

    model, processor, device = get_model_and_processor()

    inputs = processor(
        text=list(texts),
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77,
    ).to(device)

    with torch.inference_mode():
        features = model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)

    return features.cpu()


# ---------------------------------------------------------------------------
# Public embeddings API
# ---------------------------------------------------------------------------

def get_image_embedding(image):
    """Return normalized image embedding with shape (1, embedding_dim)."""
    return get_image_embeddings([image])


def get_image_embeddings(images):
    """Return normalized batch image embeddings."""
    images = list(images)

    if not images:
        raise ValueError("At least one image is required.")

    return _run_in_executor(
        _image_embeddings_impl,
        images,
    )


def get_text_embedding(text: str):
    """Return normalized text embedding with shape (1, embedding_dim)."""
    return get_text_embeddings([text])


def get_text_embeddings(texts: Sequence[str]):
    """Return normalized batch text embeddings."""
    texts = list(texts)

    if not texts:
        raise ValueError("At least one text is required.")

    return _run_in_executor(
        _text_embeddings_impl,
        texts,
    )