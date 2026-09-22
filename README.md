# AI Virtual Try-On

A full-stack AI-powered virtual try-on application. Browse Amazon clothing products, pick one you like, upload your photo, and see yourself wearing it — generated in seconds by the CatVTON AI model running on your GPU.

---

## What It Does

1. **Browse Products** — Fetches live clothing from Amazon India via the Oxylabs scraping API
2. **Upload Your Photo** — Take or upload a photo of yourself
3. **AI Try-On** — The CatVTON diffusion model generates a realistic image of you wearing the selected clothing
4. **See Results** — View, save, and compare your virtual looks

---

## Architecture

```
Browser (localhost:5173)
    |
    |-- GET /search, /products --> Backend API (port 8000)
    |                                FastAPI + Oxylabs --> Amazon
    |
    |-- POST /tryon -----------> Model API (port 8001)
                                    FastAPI + CatVTON (GPU)
                                    Downloads clothing image
                                    Runs diffusion model
                                    Returns base64 PNG
```

### Three Services

| Service | Port | Runtime | Purpose |
|---------|------|---------|---------|
| **Frontend** | 5173 | Node / npm | React 19 + Vite 8 + TailwindCSS 4 |
| **Backend API** | 8000 | Python venv / pip | Product search via Oxylabs/Amazon |
| **Model API** | 8001 | Python / uv | CatVTON virtual try-on AI (CUDA) |

---

## Prerequisites

Before running for the first time, make sure you have:

| Tool | Purpose | Install |
|------|---------|---------|
| **WSL2 + Ubuntu** | Linux environment on Windows | [docs.microsoft.com/wsl](https://docs.microsoft.com/wsl) |
| **Python 3.12** | Backend + model runtime | `sudo apt install python3.12` |
| **uv** | Model API dependency manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
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
```

### 2. Clone CatVTON (AI model — required)

CatVTON is an external repo that must be cloned separately:

```bash
mkdir -p ai
git clone https://github.com/Zheng-Chong/CatVTON.git ai/CatVTON
```

> Model weights (~5 GB) download automatically from Hugging Face on first run.

### 3. Set up Oxylabs credentials

```bash
cp backend/.env.example backend/.env
# Open backend/.env and fill in your credentials:
#   OXYLABS_USERNAME=your_username
#   OXYLABS_PASSWORD=your_password
```

No quotes needed around the values.

### 4. Install uv dependencies (model API)

```bash
uv sync
```

This installs PyTorch (CUDA), diffusers, transformers, FastAPI, and all model deps.

> First run downloads PyTorch (~2 GB). This is automatic.

### 5. Install frontend npm packages

```bash
npm --prefix frontend/frontend install
```

### 6. Install backend pip packages

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

---

## Running the Project

### Option A — All-in-one script (recommended)

From inside WSL, run from the project root:

```bash
bash start.sh
```

This single command:
- Checks for `uv`, `npm`, backend `.env`
- Creates `backend/.venv` and installs pip deps if missing
- Installs `node_modules` if missing
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
backend/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Model API:**
```bash
cd AI-Virtual-Try-On
uv run uvicorn model_api.main:app --host 0.0.0.0 --port 8001
```

**Terminal 3 — Frontend:**
```bash
cd AI-Virtual-Try-On/frontend/frontend
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
│   ├── requirements.txt      # pip deps (fastapi, uvicorn, requests, dotenv)
│   ├── .env                  # Your Oxylabs credentials (gitignored)
│   └── .env.example          # Template
│
├── frontend/frontend/
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
├── pyproject.toml            # uv project config (torch, diffusers, etc.)
├── start.sh                  # One-command startup script (bash/WSL)
├── start.ps1                 # One-command startup script (PowerShell)
└── .gitignore
```

---

## Will `bash start.sh` work on first run?

**Yes, with these caveats:**

| Step | Automatic? | Notes |
|------|-----------|-------|
| Backend venv creation | ✅ Auto | Created if `backend/.venv` missing |
| Backend pip install | ✅ Auto | Runs if venv missing |
| npm install | ✅ Auto | Runs if `node_modules` missing |
| uv dependencies | ❌ Manual | Run `uv sync` once before first `bash start.sh` |
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
| Package mgmt | `uv` (model), `pip` (backend), `npm` (frontend) |
