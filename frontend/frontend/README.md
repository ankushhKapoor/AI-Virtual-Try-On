# AI Virtual Try-On Frontend

A self-contained React + Vite frontend demo for an AI-powered virtual try-on experience. This project is intentionally frontend-only and does not include backend APIs, authentication, database storage, or payment flows.

## Included features

- Responsive product catalog and product detail pages
- Photo upload flow with virtual try-on result preview
- Wishlist, saved looks, and try-on history persisted to localStorage
- Saved look comparison and collection management UI
- Accessible navigation, modal dialogs, and empty state messaging

## Project structure

- src/ – application source code
- src/components/ – reusable UI components
- src/pages/ – route pages for the app
- src/context/ – shared try-on state provider
- src/hooks/ – local persistence hooks for wishlist and saved looks
- public/ – static assets and entry HTML

## Local persistence

The app stores UI data in browser localStorage keys:

- vesta_wishlist
- vesta_saved_looks
- vesta_tryon_history

## Run locally

cd frontend
npm install
npm run dev

## Build for production

cd frontend
npm run build

## Notes

- This frontend implementation uses demo state and placeholder flows for image generation.
- No backend communication or model inference is implemented in this repository.
- Future integration may replace mock screens with server-side AI inference and authenticated user storage.
