import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Union

import torch
from diffusers.image_processor import VaeImageProcessor
from huggingface_hub import snapshot_download
from PIL import Image, UnidentifiedImageError

from ai.config import CatVTONSettings, DEFAULT_SETTINGS, DEFAULT_CLOTH_TYPE, SUPPORTED_CLOTH_TYPES

CATVTON_ROOT = Path(__file__).resolve().parent / "CatVTON"
if str(CATVTON_ROOT) not in sys.path:
    sys.path.insert(0, str(CATVTON_ROOT))

from model.cloth_masker import AutoMasker
from model.pipeline import CatVTONPipeline
from utils import init_weight_dtype, resize_and_crop, resize_and_padding

logger = logging.getLogger(__name__)


class CatVTONServiceError(RuntimeError):
    """Base error for CatVTON service failures."""


class InvalidImageError(CatVTONServiceError):
    """Raised when an input image is missing, unreadable, or invalid."""


class UnsupportedClothTypeError(CatVTONServiceError):
    """Raised when a cloth type is not supported by the mask generation model."""


class InvalidConfigurationError(CatVTONServiceError):
    """Raised when service configuration is missing or invalid."""


class CatVTONService:
    _instance: "CatVTONService | None" = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        config: CatVTONSettings | None = None,
        **kwargs: Any,
    ):
        if getattr(self, "_initialized", False):
            return

        if config is not None:
            self.config = config
        else:
            self.config = CatVTONSettings(**kwargs) if kwargs else DEFAULT_SETTINGS

        self.device = self._resolve_device(self.config.device)
        self.width = self.config.width
        self.height = self.config.height
        self.mixed_precision = self.config.mixed_precision
        self.pipeline = None
        self.mask_processor = None
        self.automasker = None
        self.repo_path = self._resolve_repo_path()
        self._load_model()
        self._initialized = True

    @staticmethod
    def _resolve_device(device: str) -> str:
        if not device:
            raise InvalidConfigurationError("CatVTONService requires a configured GPU device.")
        normalized = device.lower()
        if not normalized.startswith("cuda"):
            raise InvalidConfigurationError(
                "CatVTONService only supports CUDA devices. "
                "No CPU fallback is implemented for this model stack."
            )
        if not torch.cuda.is_available():
            raise RuntimeError(
                "CatVTONService requires CUDA to be available. "
                "The environment does not currently expose a CUDA device."
            )
        return normalized if normalized.startswith("cuda") else "cuda"

    @staticmethod
    def _resolve_repo_path() -> str:
        candidates = [
            Path(__file__).resolve().parent / "CatVTON",
            Path.cwd() / "ai" / "CatVTON",
            Path.cwd() / "CatVTON",
        ]
        for candidate in candidates:
            if candidate.exists() and (candidate / "model").exists():
                return str(candidate)
        raise FileNotFoundError(
            "CatVTON repository not found. Clone it into ai/CatVTON before using CatVTONService."
        )

    def _load_model(self) -> None:
        if self.pipeline is not None and self.automasker is not None:
            return

        self.repo_path = snapshot_download(repo_id=self.config.resume_path)

        logger.info("Loading CatVTON pipeline on %s with precision=%s", self.device, self.mixed_precision)
        self.pipeline = CatVTONPipeline(
            base_ckpt=self.config.base_model_path,
            attn_ckpt=self.repo_path,
            attn_ckpt_version="mix",
            weight_dtype=init_weight_dtype(self.mixed_precision),
            use_tf32=False,
            device=self.device,
        )

        self.mask_processor = VaeImageProcessor(
            vae_scale_factor=8,
            do_normalize=False,
            do_binarize=True,
            do_convert_grayscale=True,
        )

        self.automasker = AutoMasker(
            densepose_ckpt=os.path.join(self.repo_path, "DensePose"),
            schp_ckpt=os.path.join(self.repo_path, "SCHP"),
            device=self.device,
        )

    @staticmethod
    def _coerce_image(image: Union[str, Path, Image.Image], label: str) -> Image.Image:
        if isinstance(image, Image.Image):
            return image.convert("RGB")
        if isinstance(image, (str, os.PathLike)):
            path = Path(image)
            if not path.exists():
                raise InvalidImageError(f"{label} image not found: {path}")
            try:
                with Image.open(path) as opened:
                    return opened.convert("RGB")
            except (FileNotFoundError, OSError, UnidentifiedImageError) as exc:
                raise InvalidImageError(f"{label} image could not be opened: {path}") from exc
        raise InvalidImageError(f"{label} image must be a PIL Image or a valid image path.")

    @staticmethod
    def _validate_cloth_type(cloth_type: str) -> str:
        normalized = str(cloth_type).lower()
        if normalized not in SUPPORTED_CLOTH_TYPES:
            raise UnsupportedClothTypeError(
                "Unsupported cloth type '"
                f"{cloth_type}'. Supported values: {', '.join(SUPPORTED_CLOTH_TYPES)}"
            )
        return normalized

    def save_result(self, result: Image.Image, output_path: Union[str, Path]) -> Path:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        result.save(output)
        logger.info("Saved CatVTON result to %s", output)
        return output

    def try_on(
        self,
        person_image: Union[str, Path, Image.Image],
        cloth_image: Union[str, Path, Image.Image],
        cloth_type: str = DEFAULT_CLOTH_TYPE,
        num_inference_steps: int = 50,
        guidance_scale: float = 2.5,
        seed: int = 42,
    ) -> dict[str, Any]:
        if num_inference_steps <= 0:
            raise InvalidConfigurationError("num_inference_steps must be greater than zero.")
        if guidance_scale <= 0:
            raise InvalidConfigurationError("guidance_scale must be greater than zero.")

        normalized_cloth_type = self._validate_cloth_type(cloth_type)
        person = self._coerce_image(person_image, "person")
        garment = self._coerce_image(cloth_image, "garment")

        person_resized = resize_and_crop(person, (self.width, self.height))
        cloth_resized = resize_and_padding(garment, (self.width, self.height))

        if self.automasker is None or self.pipeline is None or self.mask_processor is None:
            self._load_model()

        start = time.perf_counter()
        mask = self.automasker(person_resized, normalized_cloth_type)["mask"]
        mask = self.mask_processor.blur(mask, blur_factor=9)

        generator = None
        if seed != -1:
            generator = torch.Generator(device=self.device).manual_seed(seed)

        result = self.pipeline(
            image=person_resized,
            condition_image=cloth_resized,
            mask=mask,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )[0]
        elapsed = time.perf_counter() - start

        return {
            "result": result,
            "processing_time_seconds": round(elapsed, 3),
            "image_info": {
                "width": self.width,
                "height": self.height,
                "person_size": person_resized.size,
                "garment_size": cloth_resized.size,
            },
            "cloth_type": normalized_cloth_type,
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale,
            "seed": seed,
        }