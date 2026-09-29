"""
backend/recommendation/model.py

Fast FashionCLIP model manager.

Responsibilities:
- Load FashionCLIP exactly once.
- Detect XPU -> CUDA -> CPU.
- Serialize model inference through one executor.
- Support fast batched image/text similarity.
- Keep image and text embedding helpers available.
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
# Device
# ---------------------------------------------------------------------------

def _detect_device():
    import torch

    try:
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            _logger.info("[FASHIONCLIP] Using Intel XPU")
            return torch.device("xpu")
    except Exception:
        pass

    try:
        if torch.cuda.is_available():
            _logger.info("[FASHIONCLIP] Using CUDA")
            return torch.device("cuda")
    except Exception:
        pass

    _logger.info("[FASHIONCLIP] Using CPU")
    return torch.device("cpu")


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def _ensure_loaded() -> bool:
    global _model
    global _processor
    global _device
    global _load_failed

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
                "[FASHIONCLIP] Loading model: %s",
                _MODEL_NAME,
            )

            import torch
            from transformers import CLIPModel, CLIPProcessor

            device = _detect_device()

            processor = CLIPProcessor.from_pretrained(
                _MODEL_NAME,
                clean_up_tokenization_spaces=True,
            )

            model = CLIPModel.from_pretrained(
                _MODEL_NAME,
            )

            model.to(device)
            model.eval()

            # Keep CPU inference predictable.
            if device.type == "cpu":
                torch.set_num_threads(1)

            _processor = processor
            _model = model
            _device = device

            _logger.info(
                "[FASHIONCLIP] Model loaded successfully on %s",
                device,
            )

            return True

        except Exception as exc:
            _load_failed = True

            _logger.error(
                "[FASHIONCLIP] Model loading failed: %s",
                exc,
                exc_info=True,
            )

            return False


def get_model_and_processor():
    if not _ensure_loaded():
        raise RuntimeError(
            "FashionCLIP model is unavailable. "
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
# Image embeddings
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

        features = features / features.norm(
            dim=-1,
            keepdim=True,
        )

    return features.cpu()


def get_image_embeddings(images):
    images = list(images)

    if not images:
        raise ValueError(
            "At least one image is required."
        )

    return _run_in_executor(
        _image_embeddings_impl,
        images,
    )


def get_image_embedding(image):
    return get_image_embeddings([image])


# ---------------------------------------------------------------------------
# Text embeddings
# ---------------------------------------------------------------------------

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

        features = features / features.norm(
            dim=-1,
            keepdim=True,
        )

    return features.cpu()


def get_text_embeddings(texts: Sequence[str]):
    texts = list(texts)

    if not texts:
        raise ValueError(
            "At least one text is required."
        )

    return _run_in_executor(
        _text_embeddings_impl,
        texts,
    )


def get_text_embedding(text: str):
    return get_text_embeddings([text])


# ---------------------------------------------------------------------------
# FAST image -> text similarity
# ---------------------------------------------------------------------------

def _image_text_similarity_impl(
    image,
    texts: list[str],
):
    """
    One model execution for:
        image embedding
        +
        all candidate text embeddings

    This is considerably faster than running four separate
    zero-shot classification calls.
    """

    import torch

    model, processor, device = get_model_and_processor()

    image_inputs = processor(
        images=[image],
        return_tensors="pt",
    ).to(device)

    text_inputs = processor(
        text=texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77,
    ).to(device)

    with torch.inference_mode():
        image_features = model.get_image_features(
            **image_inputs
        )

        text_features = model.get_text_features(
            **text_inputs
        )

        image_features = image_features / image_features.norm(
            dim=-1,
            keepdim=True,
        )

        text_features = text_features / text_features.norm(
            dim=-1,
            keepdim=True,
        )

        scores = image_features @ text_features.T

    return scores[0].cpu()


def get_image_text_similarity(
    image,
    texts: Sequence[str],
):
    """
    Return cosine-style FashionCLIP similarity scores.

    All text candidates are evaluated against the image in one
    serialized model execution.
    """

    texts = list(texts)

    if not texts:
        raise ValueError(
            "At least one text candidate is required."
        )

    return _run_in_executor(
        _image_text_similarity_impl,
        image,
        texts,
    )