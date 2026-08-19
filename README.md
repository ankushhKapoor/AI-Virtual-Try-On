# AI Virtual Try-On

Virtual try-on system using CatVTON.

## Current Progress

- Python 3.12 environment configured with `uv`
- PyTorch and torchvision configured for CUDA
- CatVTON installed as an external, gitignored repository
- CatVTON pretrained weights tested successfully
- Custom `CatVTONService` implemented
- Direct CatVTON inference tested successfully without Gradio
- Test output generated successfully on RTX 4050 6 GB

## Setup

### 1. Clone the project

```bash
git clone <https://github.com/ankushhKapoor/AI-Virtual-Try-On.git>
cd AI-Virtual-Try-On
git switch ankush-model
```

### 2. Install dependencies

```bash
uv sync
```

### 3. Clone CatVTON

```bash
mkdir -p ai
git clone https://github.com/Zheng-Chong/CatVTON.git ai/CatVTON
```

### 4. Verify CatVTON

```bash
uv run python -m ai.test_catvton
```

Expected:

```text
CatVTON loaded successfully
```

### 5. Test inference

Place:

```text
ai/test_person.jpg
ai/test_cloth.jpg
```

Then run:

```bash
uv run python -m ai.test_catvton
```

Output:

```text
ai/test_result.png
```

## Important Notes

* `ai/CatVTON/` is external and gitignored.
* Model weights are downloaded automatically from Hugging Face.
* Do not commit model weights or generated images.
* CatVTON currently runs with FP16 and reduced resolution for the 6 GB RTX 4050.
* Gradio is only used for initial CatVTON testing, not our final application.
* Next step: integrate `CatVTONService` with the FastAPI backend.
