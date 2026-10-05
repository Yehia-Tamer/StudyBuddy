# StudyBuddy — Frontend

React 19 + Vite single-page app for StudyBuddy. See the [root README](../README.md) for the full project overview, features and architecture.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

The backend should be running at `http://127.0.0.1:8000` (see the root README's Setup section).

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## API base URL

All requests go through one axios instance in `src/client.js`:

```js
baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"
```

| Environment | `VITE_API_URL` | Result |
|---|---|---|
| `npm run dev` | not set | calls the backend directly at `http://127.0.0.1:8000` |
| `npm run build` / Docker | `/api` (from `.env.production`) | calls the same origin; nginx forwards `/api/*` to the backend |

`VITE_*` variables are **baked into the JavaScript at build time**, so changing them requires a rebuild. They are public (visible in the browser), so never put secrets in them.

## Production (Docker)

`Dockerfile` is a multi-stage build:

1. **Build stage** (`node:22-alpine`): `npm ci` then `npm run build`, producing static files in `dist/`.
2. **Serve stage** (`nginx:stable-alpine`): only `dist/` and `nginx.conf` are copied in; Node and `node_modules` don't ship.

`nginx.conf`:

- serves the built app, with `try_files $uri $uri/ /index.html` so React Router pages survive a refresh;
- proxies `/api/` to `http://backend:8000/` (the trailing slash strips the `/api` prefix);
- allows uploads up to 100 MB and waits up to 300 s for slow LLM / transcription responses;
- caches Vite's content-hashed files in `/assets/` for a year.

The image is built and run by the root `docker-compose.yml` (`docker compose up --build`). It can't run on its own, because nginx resolves the `backend` hostname, which only exists on the Compose network.
