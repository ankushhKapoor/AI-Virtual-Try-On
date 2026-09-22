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

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title='AI Virtual Try-On Model API',
    version='1.0.0',
    description='Runs the CatVTON virtual try-on model and returns the result image.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
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
    cloth_type: str = Form('upper'),
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
            cloth_type=cloth_type,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
        )
    except Exception as exc:
        logger.exception('CatVTON inference failed')
        raise HTTPException(status_code=500, detail=f'Try-on inference failed: {exc}') from exc

    result_image = output['result']
    result_b64 = _pil_to_base64(result_image, fmt='PNG')

    return JSONResponse({
        'status': 'success',
        'result_image': result_b64,
        'processing_time_seconds': output['processing_time_seconds'],
        'cloth_type': output['cloth_type'],
        'image_info': output['image_info'],
    })


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'model_api.main:app',
        host='127.0.0.1',
        port=8001,
        reload=False,
    )
