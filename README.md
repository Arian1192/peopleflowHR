# PeopleFlow HR

Monorepo bootstrap for a multi-tenant HR platform aligned to ADR-001.

## Stack
- `apps/web`: Next.js 15 + TypeScript (App Router)
- `apps/api`: Fastify + TypeScript tenant-safe MVP APIs
- Infrastructure: Docker Compose (`web`, `api`, `db`, `redis`)
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
