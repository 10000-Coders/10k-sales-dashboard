# Deploying to Cloudflare Pages

This Next.js app uses **@cloudflare/next-on-pages** for Cloudflare Pages. The repo has a `wrangler.toml` that sets the build output directory.

## Build configuration (required in Dashboard)

In **Cloudflare Dashboard** → your Pages project → **Settings** → **Builds & deployments** → **Build configuration**, set:

| Setting | Value |
|--------|--------|
| **Build command** | `npm run build:prod` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | (leave empty) |

If you use the default Next.js preset (`yarn build` / `out`), the build will not produce the output that `wrangler.toml` expects and the deployment will fail or serve the wrong files. You must use the build command above.

## Dynamic routes

The app uses dynamic routes: `/students/[id]`, `/leads/[id]`, `/activities/[id]`. With static export:

1. **generateStaticParams** is used so one path per segment is built (e.g. `/students/0`, `/leads/0`, `/activities/0`).
2. **public/_redirects** is copied to `out/` and tells Cloudflare to serve that same HTML for any id (rewrite with status 200). The client reads the real id from the URL via `useParams()`.

So visiting `/students/123` serves the same static page as `/students/0`; the browser URL stays `/students/123` and the app shows student 123.

## Environment variables

In **Settings → Environment variables** add at least:

- **`NEXT_PUBLIC_baseUrl`** – your API base URL (e.g. `https://your-api.com/api` or `https://your-api.com/api/`)
- **`NEXT_PUBLIC_env_type`** (optional) – e.g. `production`

Without these, the build may succeed but the app will not know where to call the backend. Set them for both Production and Preview if you use both.

## API

The frontend talks to your Django API. Ensure the API allows requests from your Cloudflare Pages domain (CORS) and that `NEXT_PUBLIC_baseUrl` points to the API.
