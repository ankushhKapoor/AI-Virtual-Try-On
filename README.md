# AI Virtual Try-On

A full-stack AI-powered virtual try-on application. Browse Amazon clothing products, pick one you like, upload your photo, and see yourself wearing it — generated in seconds by the CatVTON AI model running on your GPU.

---

## What It Does
---

## What It Does

1. **Browse Products** — Fetches live clothing from Amazon India via the Oxylabs scraping API
2. **Upload Your Photo** — Take or upload a photo of yourself
3. **AI Try-On** — The CatVTON diffusion model generates a realistic image of you wearing the selected clothing
4. **See Results** — View, save, and compare your virtual looks

---

## Architecture

```
Browser (localhost or LAN address :5173)
    |
    |-- /api/*   --> Vite proxy --> Backend API (configured by BACKEND_URL)
    |                              FastAPI + Oxylabs --> Amazon
    |
    |-- /model/* --> Vite proxy --> Model API (configured by MODEL_API_URL)
                                   FastAPI + CatVTON (GPU)
                                   Downloads clothing image
                                   Runs diffusion model
                                   Returns base64 PNG
```

Frontend requests stay on the page's origin, so localhost and LAN access use
the same API paths. Copy `.env.example` to `.env` to configure service targets,
ports, database settings, and credentials. No frontend source edits or LAN IP
entry are needed. `FRONTEND_ORIGINS` is only needed if a browser calls a service
directly instead of going through the Vite proxy.

### Three Services

| Service | Port | Runtime | Purpose |
|---------|------|---------|---------|
| **Frontend** | `FRONTEND_PORT` (5173) | Node / npm | React 19 + Vite 8 + TailwindCSS 4 |
| **Backend API** | `BACKEND_URL` (8000) | Root Python environment / uv | Database, product search, and recommendations |
| **Model API** | `MODEL_API_URL` (8001) | Root Python environment / uv | CatVTON virtual try-on AI (CUDA) |

Backend product and search responses are persisted in `.cache/` for 24 hours.
Restarting the backend during that period reuses those responses instead of
calling Oxylabs again. Set `BACKEND_CACHE_TTL_SECONDS` in `.env` to change it.

---

## Prerequisites

Before running for the first time, make sure you have:

| Tool | Purpose | Install |
|------|---------|---------|
| **WSL2 + Ubuntu** | Linux environment on Windows | [docs.microsoft.com/wsl](https://docs.microsoft.com/wsl) |
| **Python 3.12** | Backend + model runtime | `sudo apt install python3.12` |
| **uv** | Single Python environment and dependency manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Node.js 18+** | Frontend | `sudo apt install nodejs npm` |
| **NVIDIA GPU + CUDA** | Required for CatVTON inference | GPU with 6 GB+ VRAM |
| **Oxylabs account** | Amazon product scraping | [oxylabs.io](https://oxylabs.io) (free trial available) |
| **Git** | Cloning | pre-installed |

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone https://github.com/ankushhKapoor/AI-Virtual-Try-On.git
cd AI-Virtual-Try-On
git switch dev1
cp .env.example .env
```

Edit `.env` for your database and service credentials. `BACKEND_URL` and
`MODEL_API_URL` also set the service ports and Vite proxy targets; `FRONTEND_PORT`
sets the Vite port. These defaults work on a fresh local setup.

### 2. Clone CatVTON (AI model — required)

CatVTON is an external repo that must be cloned separately:

```bash
mkdir -p ai
git clone https://github.com/Zheng-Chong/CatVTON.git ai/CatVTON
```

> Model weights (~5 GB) download automatically from Hugging Face on first run.
> They are then kept in Hugging Face's normal local cache and reused by later
> model API restarts. The model still needs to be loaded back into GPU memory
> when its Python process is stopped and started again.

### 3. Set up Oxylabs credentials

```bash
# Open the root .env and fill in your credentials:
#   OXYLABS_USERNAME=your_username
#   OXYLABS_PASSWORD=your_password
```

No quotes needed around the values.

### 4. Create the single root Python environment

```bash
uv sync
```

This creates `./.venv` at the repository root. It installs every Python dependency for
the database, backend API, recommendation service, scripts, and model API.
Do not create or activate a virtual environment in a subdirectory.

> First run downloads PyTorch (~2 GB). This is automatic.

### Try-on evaluation metrics

Each new try-on reports two source-image diagnostics in the result screen:

- **Overall SSIM** compares the complete generated result with the input photo.
  It naturally drops when the clothing changes, so it is not a realism score.
- **Masked background SSIM** compares only pixels outside CatVTON's garment
  mask, showing whether the person/background was preserved.

For offline evaluation with paired data, the Model API also supports:

- **LPIPS** — add a `ground_truth_image` file to `POST /tryon`; lower is better.
- **FID** — submit a generated/reference image set to `POST /evaluation/fid`;
  lower is better. FID is intentionally not calculated for one try-on because
  it is a distribution-level metric.

Run `uv sync` after pulling these changes to install the LPIPS/FID packages.

### 5. Install frontend npm packages

```bash
npm --prefix frontend install
```

---

## Running the Project

### Option A — All-in-one script (recommended)

From inside WSL, run from the project root:

```bash
bash start.sh
```

This single command:
- Checks for `uv`, `npm`, and the root `.env`
- Synchronizes the one root `.venv` with `uv sync --locked`
- Installs the root npm workspace dependencies if missing
- Starts all 3 services with **live output in the terminal** (prefixed by service name)
- Opens everything on `0.0.0.0` so Windows browsers can reach it
- Press `Ctrl+C` to cleanly stop all services

**From Windows PowerShell:**

```powershell
.\start.ps1
```

(Delegates to `start.sh` inside WSL automatically.)

### Option B — Start services manually

Open three separate WSL terminals:

**Terminal 1 — Backend API:**
```bash
cd AI-Virtual-Try-On
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Model API:**
```bash
cd AI-Virtual-Try-On
uv run uvicorn model_api.main:app --host 0.0.0.0 --port 8001
```

**Terminal 3 — Frontend:**
```bash
cd AI-Virtual-Try-On/frontend
npm run dev
```

---

## Open the App

Once all 3 services are running, open your browser:

```
http://localhost:5173
```

---

## Project Structure

```
AI-Virtual-Try-On/
├── ai/
│   ├── CatVTON/              # External git clone (gitignored)
│   ├── catvton_service.py    # CatVTON wrapper class
│   └── test_catvton.py       # Standalone model test
│
├── model_api/
│   └── main.py               # FastAPI wrapper for CatVTON (port 8001)
│                             # POST /tryon  GET /health
│
├── backend/
│   ├── main.py               # FastAPI Amazon/Oxylabs API (port 8000)
│   └── recommendation/       # FashionCLIP recommendation service
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Home, Products, ProductDetails, UploadPhoto,
│   │   │                     # TryOn, Processing, TryOnResult, ...
│   │   ├── components/       # Navbar, ProductCard, ProcessingAnimation, ...
│   │   ├── context/
│   │   │   └── TryOnContext.jsx   # Global state (photo + selected product)
│   │   └── hooks/
│   │       └── useTryOn.js        # Try-on state management
│   ├── vite.config.js        # Vite config (host: 0.0.0.0, port: 5173)
│   └── package.json
│
├── .venv/                    # The one uv-managed Python environment (gitignored)
├── pyproject.toml            # All Python dependencies (database, backend, AI model)
├── start.sh                  # One-command startup script (bash/WSL)
├── start.ps1                 # One-command startup script (PowerShell)
└── .gitignore
```

---

## Will `bash start.sh` work on first run?

**Yes, with these caveats:**

| Step | Automatic? | Notes |
|------|-----------|-------|
| Root uv environment | ✅ Auto | `uv sync --locked` creates/updates `./.venv` |
| npm install | ✅ Auto | Runs in `frontend/` if its `node_modules` is missing |
| CatVTON clone | ❌ Manual | Run `git clone ... ai/CatVTON` once |
| Model weights download | ✅ Auto | Downloads on first `/tryon` request (~5 GB) |
| Oxylabs `.env` | ❌ Manual | Copy `.env.example` → `.env`, add credentials |

---

## Logs

All service logs are saved to `.logs/` and also shown live in the terminal:

```
.logs/backend.log     # Backend API logs
.logs/model_api.log   # CatVTON model API logs
.logs/frontend.log    # Vite dev server logs
```

---

## GPU Requirements

CatVTON requires an NVIDIA GPU with CUDA support:

- **Minimum:** 6 GB VRAM (RTX 4050, RTX 3060, etc.)
- **Recommended:** 8+ GB VRAM for full resolution
- **CPU-only:** Not supported (inference too slow)

If no GPU is available, the model API returns a `503` and the rest of the app still works (products, browsing, upload — just no try-on generation).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TailwindCSS 4, react-router-dom 7 |
| Backend API | FastAPI, Uvicorn, python-dotenv, requests |
| Model API | FastAPI, Uvicorn, CatVTON, PyTorch (CUDA), diffusers |
| AI Model | CatVTON (flow-matching diffusion, VITON-HD) |
| Product Data | Oxylabs Amazon Scraper API |
| Package mgmt | `uv` (all Python services), `npm` (root frontend workspace) |
