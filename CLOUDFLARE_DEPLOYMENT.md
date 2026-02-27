# Deploying to Cloudflare Pages

This Next.js app is configured for **static export** so it can be deployed to Cloudflare Pages.

## Build configuration

- **Build command:** `yarn build` (or `npm run build`)
- **Build output directory:** `out`
- **Root directory:** (leave empty, or project root)

In Cloudflare Pages project settings, set:

- **Framework preset:** Next.js (Static HTML Export)
- **Build output directory:** `out`

## Dynamic routes

The app uses dynamic routes: `/students/[id]`, `/leads/[id]`, `/activities/[id]`. With static export:

1. **generateStaticParams** is used so one path per segment is built (e.g. `/students/0`, `/leads/0`, `/activities/0`).
2. **public/_redirects** is copied to `out/` and tells Cloudflare to serve that same HTML for any id (rewrite with status 200). The client reads the real id from the URL via `useParams()`.

So visiting `/students/123` serves the same static page as `/students/0`; the browser URL stays `/students/123` and the app shows student 123.

## Environment variables

Configure in Cloudflare Pages **Settings → Environment variables** (e.g. `NEXT_PUBLIC_baseUrl` for your API base URL).

## API

The frontend talks to your Django API. Ensure the API allows requests from your Cloudflare Pages domain (CORS) and that `NEXT_PUBLIC_baseUrl` points to the API.
