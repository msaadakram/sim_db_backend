# sim_db_backend

Admin panel source for SIM Finder backend.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in your environment values.
3. Install dependencies and run:
	- `npm run dev`

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. In Vercel Project Settings → Environment Variables, add:
	- `MONGODB_URI`
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
