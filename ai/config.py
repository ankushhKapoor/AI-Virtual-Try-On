from __future__ import annotations

from dataclasses import dataclass, field

SUPPORTED_CLOTH_TYPES = ("upper", "lower", "overall", "inner", "outer")
DEFAULT_CLOTH_TYPE = "upper"
SUPPORTED_MIXED_PRECISION = ("no", "fp16", "bf16")


@dataclass(slots=True)
class CatVTONSettings:
    """Minimal runtime configuration for the CatVTON service."""

    base_model_path: str = "booksforcharlie/stable-diffusion-inpainting"
    resume_path: str = "zhengchong/CatVTON"
    width: int = 576
    height: int = 768
    mixed_precision: str = "fp16"
    device: str = "cuda"
    num_inference_steps: int = 50
    guidance_scale: float = 2.5
    seed: int = 42
    supported_cloth_types: tuple[str, ...] = field(default_factory=lambda: SUPPORTED_CLOTH_TYPES)

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise ValueError("CatVTON width and height must be positive integers.")
        if self.mixed_precision not in SUPPORTED_MIXED_PRECISION:
            raise ValueError(
                f"Unsupported mixed_precision '{self.mixed_precision}'. "
                f"Expected one of: {', '.join(SUPPORTED_MIXED_PRECISION)}."
            )
        if not self.device:
            raise ValueError("CatVTON device cannot be empty.")
        normalized = self.device.lower()
        if normalized.startswith("cuda"):
            self.device = normalized
        else:
            raise ValueError(
                "CatVTONService only supports CUDA devices. "
                "No CPU fallback is implemented for this model stack."
            )


DEFAULT_SETTINGS = CatVTONSettings()
