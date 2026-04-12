# SourceCheck Frontend

This folder contains the SourceCheck frontend application built with React and Vite.

SourceCheck helps users verify AI-generated research claims by presenting structured verdicts, corrections, and related paper suggestions in a clean, interactive UI.

## Frontend Features

- React single-page app with route navigation.
- Checker workflow with text input, topic hint, loading states, and verdict output.
- Summary and per-claim verdict cards.
- Related papers panel with external links.
- Animated visual background using Three.js via React Three Fiber.

## Tech Stack

- React 19
- Vite 8
- React Router
- Tailwind CSS
- React Three Fiber and Drei
- ESLint

## Prerequisites

- Node.js 20+
- npm 10+

## Install Dependencies

From this folder:

npm install

Or from repository root:

npm install --prefix frontend

## Run In Development

From this folder:

npm run dev

Default local URL is typically http://localhost:5173.

## Build For Production

From this folder:

npm run build

The production output is generated in the dist folder.

## Preview Production Build

From this folder:

npm run preview

## Lint

From this folder:

npm run lint

## Environment Variables

Current UI behavior works without required environment variables because results are mocked.

For backend integration, create a local env file named .env.local in this folder:

VITE_API_URL=http://localhost:8000

## Usage Flow

1. Open the app home page.
2. Scroll to the checker section.
3. Paste AI-generated research text.
4. Enter a topic or source hint.
5. Select Check Sources.
6. Review verdict cards and related papers.

Use Load Demo to auto-fill sample content for quick testing.

## Deploy To Vercel

Recommended hosting target is Vercel.

### Vercel Dashboard

1. Import the repository into Vercel.
2. Set Root Directory to frontend.
3. Use build settings:
	- Framework Preset: Vite
	- Build Command: npm run build
	- Output Directory: dist
4. Add environment variables when backend is live:
	- VITE_API_URL = deployed backend URL
5. Deploy.

### Vercel CLI

From this folder:

npm i -g vercel
vercel

For production:

vercel --prod

## Notes

- Product requirements and architecture details are documented in the root project PRD file.
- The root project README contains full repository-level documentation.
