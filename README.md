# PeopleFlow HR

Monorepo bootstrap for a multi-tenant HR platform aligned to ADR-001.

## Stack
- `apps/web`: Next.js 15 + TypeScript (App Router)
- `apps/api`: Fastify + TypeScript tenant-safe MVP APIs
- Infrastructure: Docker Compose (`web`, `api`)
- CI: GitHub Actions for lint/typecheck/test

## Quick start
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm install
npm run test --workspace apps/api
npm run dev --workspace apps/api
npm run dev --workspace apps/web
```

## Docker Compose
```bash
docker compose up --build
```

Esto levanta:
- `web` en `http://localhost:3000`
- `api` en `http://localhost:4000`

## Optional Future Infrastructure
If you want local Postgres + Redis ready for future development:
```bash
npm run dev:infra
```

This lifts:
- `web` in `http://localhost:3000`
- `api` in `http://localhost:4000`
- `postgres` in `http://localhost:5432`
- `redis` in `http://localhost:6379`

Notes:
- The current API still uses the in-memory store.
- `DATABASE_URL` and `REDIS_URL` are wired so readiness checks can validate connectivity now.
- Use `GET /readyz` to verify process + optional infrastructure reachability.

## Coolify deployment configuration
Use the step-by-step Coolify setup guide in [`COOLIFY_SETUP.md`](COOLIFY_SETUP.md).
It includes:
- API and Web app definitions from this repo
- Environment variable wiring for production
- First deployment and smoke-check checklist

Important:
- The current API is in-memory. It does not require Postgres or Redis to boot in Coolify.
- The web app now reads `API_BASE_URL` at runtime, so it does not need the API URL baked into the image build.

## GitHub bootstrap and PR workflow
1. Add remote and push `main`:
```bash
git remote add origin https://github.com/Arian1192/peopleflowHR.git
git push -u origin main
```
2. Enable branch protection on `main`:
- Require pull request before merge
- Require at least 1 approval
- Require status checks to pass (`CI`)
- Prevent force pushes and branch deletion
3. Day-to-day PR flow:
```bash
git checkout -b feat/<short-topic>
git push -u origin feat/<short-topic>
# open PR into main and merge only after CI + review
```

## API auth context headers (MVP)
Tenant-scoped routes require:
- `x-tenant-id`
- `x-user-id`

Role checks are resolved from memberships per tenant.
