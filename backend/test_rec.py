import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import asyncio
from main import app
from httpx import AsyncClient, ASGITransport

async def test():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        payload = {
            'product': {
                'asin': 'B0GLGKGCB4',
                'title': 'Amayra Women Kurta Set',
                'category': 'Dresses',
                'image': 'https://m.media-amazon.com/images/I/81stfgnFx4L._SL1500_.jpg'
            }
        }
        r = await client.post('/recommendations', json=payload)
        print('/recommendations status:', r.status_code)
        if r.status_code == 200:
            data = r.json()
            recs = data.get('recommendations', [])
            print('Slot count:', len(recs))
            for rec in recs:
                prods = rec.get('products', [])
                img = prods[0].get('image') if prods else 'none'
                print(f"  Slot {rec.get('slot')}: {len(prods)} products, first image: {img}")

asyncio.run(test())
