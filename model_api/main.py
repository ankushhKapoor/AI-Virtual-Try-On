from __future__ import annotations

import base64
import io
import logging
import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Hugging Face's normal user cache is deliberately the default. It is shared
# across project restarts, so previously downloaded CatVTON weights are reused
# without creating a second multi-GB copy inside this repository. Set
# MODEL_CACHE_DIR only when an explicit custom cache location is required.
_configured_cache_dir = os.getenv('MODEL_CACHE_DIR')
if _configured_cache_dir:
    MODEL_CACHE_DIR = Path(_configured_cache_dir).expanduser()
    if not MODEL_CACHE_DIR.is_absolute():
        MODEL_CACHE_DIR = PROJECT_ROOT / MODEL_CACHE_DIR
    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault('HF_HOME', str(MODEL_CACHE_DIR))
    os.environ.setdefault('HF_HUB_CACHE', str(MODEL_CACHE_DIR / 'hub'))
else:
    MODEL_CACHE_DIR = Path(os.getenv('HF_HUB_CACHE', '~/.cache/huggingface/hub')).expanduser()

from app.networking import frontend_origins, service_port
from ai.evaluation import evaluate_tryon
from ai.garment_type import resolve_garment_type

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title='AI Virtual Try-On Model API',
    version='1.0.0',
    description='Runs the CatVTON virtual try-on model and returns the result image.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins(),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

_service = None
_service_error = None


def get_service():
    global _service, _service_error
    if _service is not None:
        return _service
    if _service_error is not None:
        raise RuntimeError(_service_error)
    try:
        logger.info('Loading CatVTON; Hugging Face cache: %s', MODEL_CACHE_DIR)
        from ai.catvton_service import CatVTONService
        _service = CatVTONService()
        logger.info('CatVTON service loaded successfully')
        return _service
    except Exception as exc:
        _service_error = str(exc)
        logger.error('Failed to load CatVTON service: %s', exc)
        raise RuntimeError(_service_error) from exc


def _pil_to_base64(image, fmt='PNG'):
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f'data:image/{fmt.lower()};base64,{b64}'


def _fetch_image_from_url(url):
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/125.0.0.0 Safari/537.36'
        ),
        'Referer': 'https://www.amazon.in/',
    }
    try:
        resp = requests.get(url, headers=headers, timeout=30, stream=True)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert('RGB')
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f'Could not download cloth image from URL: {exc}',
        ) from exc


@app.get('/')
def root():
    return {
        'status': 'ok',
        'message': 'AI Virtual Try-On Model API',
        'endpoints': {
            'health': '/health',
            'tryon': 'POST /tryon',
        },
    }


@app.get('/health')
def health():
    try:
        import torch
        cuda_available = torch.cuda.is_available()
    except ImportError:
        cuda_available = False
    return {
        'status': 'ok',
        'cuda_available': cuda_available,
        'model_loaded': _service is not None,
        'model_error': _service_error,
    }


@app.post('/tryon')
async def tryon(
    person_image: UploadFile = File(...),
    cloth_url: Optional[str] = Form(None),
    cloth_image: Optional[UploadFile] = File(None),
    cloth_type: Optional[str] = Form(None),
    garment_name: Optional[str] = Form(None),
    garment_category: Optional[str] = Form(None),
    num_inference_steps: int = Form(50),
    guidance_scale: float = Form(2.5),
    seed: int = Form(42),
):
    if not cloth_url and cloth_image is None:
        raise HTTPException(
            status_code=422,
            detail='Provide either cloth_url or cloth_image.',
        )

    try:
        person_bytes = await person_image.read()
        person_pil = Image.open(io.BytesIO(person_bytes)).convert('RGB')
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f'Invalid person image: {exc}') from exc

    if cloth_url:
        cloth_pil = _fetch_image_from_url(cloth_url)
    else:
        try:
            cloth_bytes = await cloth_image.read()
            cloth_pil = Image.open(io.BytesIO(cloth_bytes)).convert('RGB')
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f'Invalid cloth image: {exc}') from exc

    resolved_cloth_type = resolve_garment_type(
        cloth_type,
        garment_name,
        garment_category,
    )
    logger.info(
        'Try-on garment type resolved to %s (name=%r, category=%r)',
        resolved_cloth_type,
        garment_name,
        garment_category,
    )

    try:
        service = get_service()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=f'Model not available: {exc}. Ensure CUDA is available and CatVTON is installed.',
        ) from exc

    try:
        output = service.try_on(
            person_image=person_pil,
            cloth_image=cloth_pil,
            cloth_type=resolved_cloth_type,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
        )
    except Exception as exc:
        logger.exception('CatVTON inference failed')
        raise HTTPException(status_code=500, detail=f'Try-on inference failed: {exc}') from exc

    result_image = output['result']
    result_b64 = _pil_to_base64(result_image, fmt='PNG')
    try:
        evaluation_metrics = evaluate_tryon(
            person_image=output['person_image'],
            result_image=result_image,
            garment_mask=output['garment_mask'],
        )
    except Exception:
        # Quality reporting must never make an otherwise valid try-on fail.
        logger.exception('Could not calculate try-on evaluation metrics')
        evaluation_metrics = None

    return JSONResponse({
        'status': 'success',
        'result_image': result_b64,
        'processing_time_seconds': output['processing_time_seconds'],
        'cloth_type': output['cloth_type'],
        'image_info': output['image_info'],
        'evaluation_metrics': evaluation_metrics,
    })


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'model_api.main:app',
        host='0.0.0.0',
        port=service_port('MODEL_API_URL', 'http://127.0.0.1:8001'),
        reload=False,
    )
