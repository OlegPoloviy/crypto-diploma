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

Run migrations against Supabase only from a production shell/env:

```powershell
pnpm --filter crypto-api migration:run
```

Do not copy local `.env` values to Render. Local Docker data and Supabase data
should stay separate.
