# QRIS Web Merchant (Metronic) — Project Skeleton & How-To

This repository is a React 19 + Vite 7 application styled with Metronic-inspired layouts. It ships with a production-ready Docker/Nginx setup and common tooling (ESLint, Prettier, Tailwind).

The README explains:
- How the skeleton is structured and where to start coding
- How to run locally, build, and preview
- How to containerize and deploy with Nginx
- How to work with Git (branching, committing, pushing)

---

## 1) Prerequisites

- Node.js 18+ (Node 21 is used in the Docker build)
- npm 9+
- Git
- Optional: Docker 24+ (for containerized builds and deployment)

---

## 2) Project Structure (high level)

- `src/` — app source code (components, pages, services, context)
  - `components/` — reusable UI parts and layout components
  - `pages/` — route-level pages (e.g., Metronic layouts and screens)
  - `services/` — API/Axios instances and auth-related utilities
  - `context/` — React context providers for app-wide state
- `public/` — static assets copied as-is
- `index.html` — Vite entry HTML
- `vite.config.js` — Vite configuration
- `nginx.conf` — Nginx template used in the Docker image
- `Dockerfile` — multi-stage build and Nginx-based production image

Where to begin in code:
- Start from `src/` and explore `pages/` to see how screens are composed.
- Layouts and page shells live under `src/components/layouts/` and `src/pages/metronic-layouts/`.
- API interactions: `src/services/AxiosInstance.js` and `src/services/AuthService.js`.
- App-wide data: `src/context/AppDataContext.jsx`.

---

## 3) Environment Variables

Create and edit a `.env` file at the project root for local development. Common patterns include:

```
# Example keys (adjust to your backend)
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_ENV=local
```

Usage: any variable prefixed with `VITE_` is exposed to the client and can be read via `import.meta.env.VITE_*`.

Note (Docker/Nginx): the production image injects meta tags via Nginx Server Side Includes (SSI) using two environment variables:
- `nginx_ssi_url` → becomes a `<meta name="app_url" ...>` value
- `nginx_ssi_env` → becomes a `<meta name="app_env" ...>` value

You can use these to expose deployment metadata at runtime without rebuilding.

---

## 4) Install & Run Locally

1. Install dependencies:
   ```
   npm install --legacy-peer-deps
   ```
2. Start the dev server:
   ```
   npm run dev
   ```
3. Open the app (default Vite port): http://localhost:5173

Lint/format:
```
npm run lint
npm run format
```

---

## 5) Build & Preview

- Production build (outputs to `dist/`):
  ```
  npm run build
  ```
- Local static preview of the built app:
  ```
  npm run preview
  ```

The `dist/` folder can be served by any static web server (Nginx, Apache, S3/CloudFront, Vercel static, Netlify, etc.).

---

## 6) Dockerized Production (Nginx)

The provided `Dockerfile` builds the app and serves it with Nginx.

Build the image:
```
docker build -t qris-web-merchant-metronic:latest .
```

Run the container:
```
docker run --rm -p 8080:80 \
  -e nginx_ssi_url="https://merchant.example.com" \
  -e nginx_ssi_env="production" \
  qris-web-merchant-metronic:latest
```

Open http://localhost:8080.

Notes:
- The Dockerfile copies `dist/` to Nginx’s web root and enables SSI-injected meta tags for `app_url` and `app_env`.
- You can customize Nginx via `nginx.conf` if needed.

---

## 7) Deployment Options

Option A — Static hosting:
- Run `npm run build` and upload the contents of `dist/` to your static host.

Option B — Nginx on a server/VM:
- Copy `dist/` to `/usr/share/nginx/html` and place an appropriate Nginx site config (use `nginx.conf` as a starting point).

Option C — Docker container:
- Build and push the Docker image to your registry (e.g., GHCR, ECR):
  ```
  docker tag qris-web-merchant-metronic:latest YOUR_REGISTRY/qris-web-merchant-metronic:TAG
  docker push YOUR_REGISTRY/qris-web-merchant-metronic:TAG
  ```
- Deploy the image to your platform (Kubernetes, ECS, Swarm, VM) and set `nginx_ssi_url`/`nginx_ssi_env` env vars as needed.

---

## 8) Working with Git

Initial setup:
```
git clone <REPO_URL>
cd qris-web-merchant-metronic
git checkout -b feature/your-feature
```

Commit and push changes:
```
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Open a Pull Request (PR) on your Git platform and request review.

Update your local branch with the latest `main` changes:
```
git checkout main
git pull origin main
git checkout feature/your-feature
git rebase main   # or: git merge main
```

Tagging a release (optional):
```
git tag -a v1.0.0 -m "First release"
git push origin v1.0.0
```

---

## 9) Troubleshooting

- Port already in use on `5173`: either stop the other process or set `--port` for Vite.
- API calls failing: ensure `VITE_API_BASE_URL` is correct and backend is reachable.
- Docker build issues: confirm Node can install dependencies and that the build works locally (`npm run build`).

---

## 10) Useful Scripts

```
npm run dev       # start local dev server
npm run build     # production build to dist/
npm run preview   # preview built app locally
npm run lint      # lint (auto-fix on src/)
npm run format    # prettier format
```

---

## 11) License

Private/internal project unless stated otherwise.
