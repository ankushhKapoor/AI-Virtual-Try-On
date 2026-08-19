from pathlib import Path

from PIL import Image

from ai.catvton_service import CatVTONService

    
service = CatVTONService()

person_image = Image.open("ai/test_person.jpg")
cloth_image = Image.open("ai/test_cloth.jpg")

result = service.try_on(
    person_image=person_image,
    cloth_image=cloth_image,
    cloth_type="upper",
    num_inference_steps=50,
    guidance_scale=2.5,
    seed=42,
)

output_path = Path("ai/test_result.png")
result.save(output_path)

print(f"Result saved to {output_path}")