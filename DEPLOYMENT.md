# Deployment and Environment Split

## Local Development

Use the local Docker Postgres from `compose.yml`. This keeps experiments, large
parsed texts, failed jobs, and test data out of Supabase.

```powershell
docker compose up -d postgres
pnpm --filter crypto-api migration:run
pnpm dev:api
pnpm dev:web
```

Local API env lives in `apps/api/crypto-api/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=crypto
DATABASE_PASSWORD=crypto
DATABASE_NAME=crypto
DATABASE_SSL=false
TYPEORM_LOGGING=true
```

The local web app proxies to `http://localhost:3000` by default, so no web env is
required for local development.

## Production

Use hosted services:

- Vercel: `apps/web/crypto-web`
- Render: `apps/api/crypto-api`
- Supabase: Postgres

Render API env:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<supabase pooled connection string>
DATABASE_SSL=true
TYPEORM_LOGGING=false
```

Vercel web env:

```env
API_URL=https://your-crypto-api.onrender.com
```

If Vercel returns `Internal server error` from `/api/*`, check the Vercel
function logs first. A missing `API_URL` makes the web app try
`http://localhost:3000`, which is only valid for local development. If `API_URL`
is correct but Render returns a database error, run the production migrations
against Supabase.

Run migrations against Supabase only from a production shell/env:

```powershell
pnpm --filter crypto-api migration:run
```

If migrations can run from a production shell/env, use the compiled migration command:

```powershell
pnpm --filter crypto-api migration:run:prod
```

On Render Free, `preDeployCommand` is not available. If Render migration commands
are unreliable, run the manual Supabase SQL patch instead:

```text
apps/api/crypto-api/sql/supabase-manual-schema.sql
```

Open Supabase SQL Editor, paste the file contents, and run it against the
production database.

For a one-shot Render Shell fix, run:

```powershell
pnpm --filter crypto-api build
pnpm --filter crypto-api migration:run:prod
```

Do not copy local `.env` values to Render. Local Docker data and Supabase data
should stay separate.
