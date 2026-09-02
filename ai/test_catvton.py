import time
from pathlib import Path

from PIL import Image

from ai.catvton_service import CatVTONService


def main() -> int:
    output_path = Path("ai/test_result.png")
    start = time.perf_counter()

    try:
        service = CatVTONService()
        person_image = Image.open("ai/test_person.jpg")
        cloth_image = Image.open("ai/test_cloth.jpg")

        inference_result = service.try_on(
            person_image=person_image,
            cloth_image=cloth_image,
            cloth_type="upper",
            num_inference_steps=50,
            guidance_scale=2.5,
            seed=42,
        )

        generated = inference_result["result"]
        service.save_result(generated, output_path)
        elapsed = time.perf_counter() - start
        actual_time = inference_result["processing_time_seconds"]

        print(f"CatVTON inference status: SUCCESS")
        print(f"Processing time (reported): {actual_time:.3f}s")
        print(f"Processing time (wall clock): {elapsed:.3f}s")
        print(f"Output saved to: {output_path}")
        print(f"Output size: {generated.size}")
        return 0
    except Exception as exc:  # pragma: no cover - explicit failure reporting in CLI
        elapsed = time.perf_counter() - start
        print(f"CatVTON inference status: FAILURE")
        print(f"Error: {exc}")
        print(f"Elapsed time before failure: {elapsed:.3f}s")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())