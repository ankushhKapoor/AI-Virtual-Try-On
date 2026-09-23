# FashionCLIP Outfit Recommendation System

## Overview

This module adds AI-powered outfit recommendations to the AI Virtual Try-On project.
When a user views a product on the ProductDetails page, a **"Complete the Look"** section
appears below, showing real Amazon products that complement the selected clothing.

---

## Architecture

```
User opens ProductDetails
        │
        ▼
CompleteTheLook.jsx
  POST /recommendations
        │
        ▼  (backend/recommendation/)
router.py  ──→  classifier.py  ──→  FashionCLIP (patrickjohncyh/fashion-clip)
                     │
                     ▼ attributes {category, color, style, pattern, gender}
                     │
               recommender.py  ──→  rules.py  (compatibility config)
                     │
                     ▼ search queries per slot
                     │
               GET /search  (EXISTING endpoint)
                     │
                     ▼
               Existing TTL cache + Oxylabs
                     │
                     ▼
               Real Amazon products → frontend
```

---

## What FashionCLIP Does

[patrickjohncyh/fashion-clip](https://huggingface.co/patrickjohncyh/fashion-clip) is
a CLIP-based model fine-tuned on the FACAD fashion dataset (800K+ fashion image-text pairs).

It is used here for **zero-shot image classification**:

1. The selected product's image is downloaded.
2. FashionCLIP compares the image against candidate text labels
   (e.g., `["t-shirt", "jacket", "jeans", "dress", …]`).
3. The best-matching label becomes the detected **category**.
4. The same approach classifies **color**, **style**, and **pattern**.

FashionCLIP does NOT directly output "buy this product." It outputs semantic attributes
that drive the compatibility rules layer.

---

## Compatibility Rules (`rules.py`)

All outfit compatibility logic lives in `backend/recommendation/rules.py`.

### `CATEGORY_COMPLEMENTS`
Maps a detected clothing category to the outfit **slots** to fill:
```python
"jacket": ["top", "bottom", "footwear"]
"dress":  ["footwear", "accessory"]
```

### `SLOT_CATEGORIES`
Maps a slot to its candidate clothing categories:
```python
"footwear": ["sneakers", "shoes", "boots", "sandals", "loafers", "heels"]
```

### `STYLE_SLOT_PREFERENCES`
Per-style category preferences. When style is detected, this overrides
the generic slot categories:
```python
"formal": {"footwear": ["formal shoes", "loafers", "heels"]}
```

### `COLOR_COMPATIBILITY`
Which colors pair well with each detected color:
```python
"black": ["white", "grey", "beige", "blue", "red", "olive", "cream"]
```

---

## How Amazon Products Are Retrieved

For each outfit slot, `recommender.py` builds a natural-language search query:

```
color + style + gender + category  →  "white casual men's t-shirt"
```

It then calls the **existing** `GET /search` endpoint on the same FastAPI server.
This reuses:
- The existing Oxylabs integration (unchanged)
- The existing server-side TTL cache (`_search_cache`, 30 min TTL)

No second Oxylabs integration is created. No model weights are stored in the repo.

---

## Caching

| Layer | Location | TTL |
|---|---|---|
| Recommendation result | `recommender.py` (`_rec_cache`) | 30 min |
| Search results | `backend/main.py` (`_search_cache`) | 30 min |
| Browser cache | `apiCache.js` (sessionStorage + Memory) | 30 min |

Repeated `POST /recommendations` for the same ASIN returns instantly from the
in-process cache (no FashionCLIP inference, no Oxylabs calls).

---

## Starting the Backend

```bash
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

On first request the FashionCLIP model (~600 MB) is downloaded from HuggingFace
and cached in `~/.cache/huggingface/hub/`. Subsequent startups load from the cache
(much faster).

---

## Testing the Recommendation Endpoint

```bash
curl -X POST http://127.0.0.1:8000/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "asin": "B0GLGKGCB4",
      "title": "Men Black Denim Jacket",
      "image": "https://m.media-amazon.com/images/...",
      "brand": "Brand",
      "category": "jacket",
      "domain": "in"
    }
  }'
```

Expected response shape:
```json
{
  "status": "success",
  "source_product": {...},
  "attributes": {
    "category": "jacket",
    "color": "black",
    "style": "casual",
    "pattern": "solid",
    "gender": "men",
    "confidence": 0.87,
    "source": "fashionclip"
  },
  "recommendations": [
    {
      "slot": "top",
      "category": "t-shirt",
      "query": "white casual men's t-shirt",
      "products": [...]
    },
    ...
  ]
}
```

---

## Adding New Clothing Categories

Edit `backend/recommendation/rules.py`:

1. Add the new category to `CATEGORY_COMPLEMENTS` with its outfit slots.
2. Add candidate labels to `classifier.py` → `CATEGORY_CANDIDATES`.
3. Add title-matching regex in `classifier.py` → `_TITLE_CATEGORY_PATTERNS`.

---

## Modifying Compatibility Rules

All rules are in `backend/recommendation/rules.py` — edit the dicts directly.
No code changes are needed in other files.

---

## Fallback Behaviour

| Failure | Result |
|---|---|
| Product has no image | Title-regex fallback extracts category/color |
| FashionCLIP model unavailable | Title-regex fallback |
| All fallbacks fail | Generic rules applied (top + bottom + footwear) |
| Individual slot search fails | Slot is skipped; others still returned |
| Entire `/recommendations` fails | Frontend shows "Recommendations temporarily unavailable" — product page unchanged |

---

## Files Added

```
backend/recommendation/
    __init__.py        Package marker
    model.py           FashionCLIP singleton model manager
    classifier.py      Zero-shot image classification + title fallback
    rules.py           Outfit compatibility configuration
    recommender.py     Query builder + /search caller + result scorer
    router.py          POST /recommendations FastAPI router

frontend/frontend/src/components/
    CompleteTheLook.jsx    "Complete the Look" UI section
```

## Files Modified (minimal changes only)

```
backend/main.py                        +2 lines: import + include_router
frontend/.../pages/ProductDetails.jsx  +2 lines: import + <CompleteTheLook />
```
