# Coolify Setup for PeopleFlow HR

This repository is ready to deploy to Coolify as two separate applications:
- `apps/api`
- `apps/web`

Important before you start:
- The current API is an in-memory MVP. It does not need Postgres or Redis to run.
- The web app reads `API_BASE_URL` at runtime, so you do not need to pass the API URL as a Docker build argument.
- Deploy the API first, then the web app.
- If you want future-ready infra from day one, you can also create Postgres and Redis now and wire `DATABASE_URL` / `REDIS_URL` into the API.

## 1. Prerequisites

You need all of the following before creating the apps in Coolify:
- A working Coolify instance connected to a target server
- This Git repository available from Coolify
- A branch to deploy, normally `main`
- Two domains or subdomains, one for the API and one for the web

Recommended domain layout:
- `api.peopleflow.example.com` for the API
- `app.peopleflow.example.com` for the web

## 2. Verify the server connection in Coolify

Do not create the applications until the server shows as healthy inside Coolify.

In `Infrastructure -> Servers -> <your-server>` verify:
- `Host` is only the IP or hostname
- `Port` is the real SSH port, usually `22`
- `User` is the correct SSH user for that machine

If Coolify cannot connect:
- `Connection timed out` usually means wrong IP, closed port, or firewall issue
- `Permission denied (publickey)` usually means wrong SSH user or missing key
- `Host key verification failed` usually means the machine was rebuilt and the saved fingerprint is stale

On the target server, make sure SSH is running and accessible:

```bash
sudo systemctl enable --now ssh || sudo systemctl enable --now sshd
sudo ss -ltnp | grep ':22'
sudo ufw allow 22/tcp || true
```

If the server was recreated with the same IP/hostname, remove the old key from the Coolify host:

```bash
ssh-keygen -R <your-server-host>
```

## 3. Repository facts that matter for deployment

Coolify should use these exact settings from this repository:
- API Dockerfile: `apps/api/Dockerfile`
- Web Dockerfile: `apps/web/Dockerfile`
- API internal port: `4000`
- Web internal port: `3000`
- API health endpoint: `/healthz`
- API readiness endpoint: `/readyz`

The containers are now built with:
- `npm ci` instead of `npm install`
- `package-lock.json` included for deterministic builds
- Multi-stage Dockerfiles for cleaner production images

## 4. Create the API application in Coolify

Create the API first.

In Coolify:
1. Open your project.
2. Click `New Resource`.
3. Choose `Application`.
4. Connect the Git repository for this project.
5. Select the branch you want to deploy, normally `main`.
6. Choose `Dockerfile` as the build pack.

Set these values:
- Name: `peopleflow-api`
- Dockerfile location: `apps/api/Dockerfile`
- Port: `4000`

Add these environment variables:
- `NODE_ENV=production`
- `PORT=4000`

Do not add database or redis variables for the current version of this project.

Optional future-ready variables:
- `DATABASE_URL=postgres://postgres:<POSTGRES_PASSWORD>@<POSTGRES_HOST>:5432/peopleflow`
- `REDIS_URL=redis://<REDIS_HOST>:6379`

Configure the domain:
1. Open the `Domains` tab.
2. Add your API domain, for example `api.peopleflow.example.com`.
3. Enable HTTPS/TLS in Coolify.

Configure the health check:
1. Open the `Healthcheck` section.
2. Set path to `/healthz`.
3. Save.

Deploy the API.

What you should verify immediately after deploy:
- The deployment finishes without build errors
- The container starts without restart loops
- `https://<api-domain>/healthz` returns HTTP `200`
- The response body is `{"ok":true}`
- `https://<api-domain>/readyz` returns:
  - `200` if the API is healthy and all configured infra targets are reachable
  - `503` if a configured DB/Redis target is unreachable

If the API does not become healthy, check logs for:
- wrong Dockerfile path
- missing port configuration
- application crash during startup

## 5. Create the web application in Coolify

Create the web app only after the API URL is already known and working.

In Coolify:
1. Open the same project.
2. Click `New Resource`.
3. Choose `Application`.
4. Connect the same Git repository.
5. Select the same branch, normally `main`.
6. Choose `Dockerfile` as the build pack.

Set these values:
- Name: `peopleflow-web`
- Dockerfile location: `apps/web/Dockerfile`
- Port: `3000`

Add these environment variables:
- `NODE_ENV=production`
- `PORT=3000`
- `API_BASE_URL=https://<api-domain>`

Use the real public API URL, for example:
- `API_BASE_URL=https://api.peopleflow.example.com`

Configure the domain:
1. Open the `Domains` tab.
2. Add your web domain, for example `app.peopleflow.example.com`.
3. Enable HTTPS/TLS in Coolify.

Deploy the web application.

What you should verify immediately after deploy:
- The image builds successfully
- The container starts without restart loops
- Opening `https://<web-domain>` loads the page
- The home page shows `Runtime status: api healthy`

## 6. Exact deployment order

Use this order every time you do a fresh setup:

1. Connect and validate the target server in Coolify.
2. Create and deploy `peopleflow-api`.
3. Confirm `https://<api-domain>/healthz` responds with HTTP `200`.
4. Create and deploy `peopleflow-web`.
5. Confirm the web page loads and reports the API as healthy.

If you redeploy both applications after changes:
1. Deploy API first if API behavior changed.
2. Deploy web second if the web depends on new API behavior.

## 7. Smoke test checklist after the first deployment

Run all of these checks without skipping any:

1. Open `https://<api-domain>/healthz`.
2. Confirm the status code is `200`.
3. Confirm the response body is `{"ok":true}`.
4. Open `https://<api-domain>/readyz`.
5. If you configured `DATABASE_URL` and `REDIS_URL`, confirm both report `reachable`.
6. Open `https://<web-domain>`.
7. Confirm the page renders without `502`, `503`, or `SSL` errors.
8. Confirm the page text shows `Runtime status: api healthy`.
9. Open the Coolify logs for both services and confirm there are no crash loops.

## 8. Common mistakes in Coolify for this repo

These are the failures most likely to happen:

### Wrong Dockerfile path

Use these exact paths:
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`

If you point Coolify at the repository root Dockerfile, the deployment will fail because there is no root Dockerfile in this repo.

### Deploying the web before the API

If `API_BASE_URL` points to a domain that is not live yet:
- the web container will still boot
- the home page will report `api unreachable`

That is why the API must be deployed first.

### Using the wrong environment variable in the web app

For this project, configure:
- `API_BASE_URL`

Do not rely on `NEXT_PUBLIC_API_BASE_URL` for the production deployment path. The web server now reads the API base URL at runtime.

### Expecting persistence that does not exist yet

The API currently stores data in memory.

That means:
- a restart can reset data
- scaling to multiple API replicas would create inconsistent state

For the current MVP this is acceptable, but for real production usage you should add persistent storage before going live with real users.

### Confusing health with readiness

Use:
- `/healthz` to know if the API process is alive
- `/readyz` to know whether configured infrastructure targets are reachable

If you add Postgres/Redis later, use `/readyz` as your stronger deployment verification endpoint.

## 9. Rollback procedure

If a deployment fails:

1. In Coolify, open the affected application.
2. Go to the deployments history.
3. Select the last healthy deployment.
4. Roll back to that deployment.
5. Verify the health check again.

Rollback priorities:
- If only the web broke, roll back `peopleflow-web`
- If only the API broke, roll back `peopleflow-api`
- If both broke, recover the API first and the web second

## 10. Local verification before pushing changes

Before sending new commits to Coolify, run this locally:

```bash
npm run build
npm test --workspace apps/api
```

Optional local container check:

```bash
docker compose up --build
```

Or, with future-ready infra:

```bash
docker compose -f docker-compose.yml -f docker-compose.infrastructure.yml up --build
```

Then verify:
- `http://localhost:4000/healthz`
- `http://localhost:4000/readyz`
- `http://localhost:3000`

## 11. Files you should use as reference

If you need to review the deployment configuration later, these are the relevant files:
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/api/.env.coolify.example`
- `apps/api/.env.future.example`
- `apps/web/.env.coolify.example`
- `docker-compose.yml`
- `docker-compose.infrastructure.yml`
