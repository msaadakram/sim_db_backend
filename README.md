# sim_db_backend

Admin panel source for SIM Finder backend.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in your environment values.
   - Set `MONGODB_DB_NAME=sim-finder-admin` (target DB used by the app/scripts).
   - If your current active data is in another DB (for example `sim-finder`), set `MONGODB_SOURCE_DB_NAME=sim-finder`.
	- To view newsletter subscribers in admin, set:
	  - `NEWSLETTER_DB_NAME=sim-finder`
	  - `NEWSLETTER_COLLECTION=newsletter_subscribers`
3. Install dependencies and run:
	- `npm run dev`

## Database setup and migration

- The app now always connects using `MONGODB_DB_NAME` (default: `sim-finder-admin`).
- To migrate all collections/documents from the active/source DB into `sim-finder-admin`:
	- `npm run migrate:active-db`
- Then seed required admin defaults:
	- `npm run seed`
- Newsletter subscribers can be viewed and exported from Dashboard → Subscribers.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. In Vercel Project Settings → Environment Variables, add:
	- `MONGODB_URI`
	- `MONGODB_DB_NAME` (recommended: `sim-finder-admin`)
	- `MONGODB_SOURCE_DB_NAME` (optional; only for migration workflows)
	- `JWT_SECRET`
	- `JWT_EXPIRES_IN`
	- `ADMIN_USERNAME`
	- `ADMIN_PASSWORD`
	- `RATE_LIMIT_WINDOW_MS`
	- `RATE_LIMIT_MAX`
	- `API1_URL`
	- `API2_URL`
	- `API_TIMEOUT`
	- `CACHE_TTL`
	- `CORS_ALLOWED_ORIGINS` (comma-separated; e.g. `http://localhost:5050`)
4. Deploy.

The project includes `vercel.json` with Next.js build/install commands.
