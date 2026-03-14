# Coolify Setup for PeopleFlow HR

This runbook translates the current repo configuration into a production-ready Coolify setup.

## Prerequisites
- Project has access to repo `https://github.com/Arian1192/peopleflowHR.git`
- Coolify project/environment selected
- Domain names available (or temporary Coolify-generated URLs)

## 0) Fix server SSH connectivity (required before deployments)

If Coolify fails to connect to a target server, fix this first. Typical errors are:
- `Connection timed out`
- `Permission denied (publickey)`
- `No route to host`
- `Host key verification failed`

### A) Verify target host and port in Coolify
- In `Infrastructure -> Servers -> <server>`, set `Host` to raw hostname or IP only (no `http://` or path).
- Set the right `Port` (usually `22`).
- Set the correct SSH user (`root`, `ubuntu`, `debian`, etc. depending on your VM image).

### B) Install Coolify public key on the target host
1. In Coolify server settings, copy the SSH public key for this server entry.
2. On target host, create the user if missing and install key:
   ```bash
   sudo adduser --disabled-password --gecos "" coolify
   sudo usermod -aG sudo coolify
   sudo mkdir -p /home/coolify/.ssh
   sudo chmod 700 /home/coolify/.ssh
   sudo tee -a /home/coolify/.ssh/authorized_keys
   sudo chmod 600 /home/coolify/.ssh/authorized_keys
   sudo chown -R coolify:coolify /home/coolify/.ssh
   ```
3. Paste the Coolify public key into `/home/coolify/.ssh/authorized_keys`.

### C) Ensure SSH daemon and firewall allow access
Run on target host:
```bash
sudo systemctl enable --now ssh || sudo systemctl enable --now sshd
sudo ss -ltnp | rg ':22'
sudo ufw allow 22/tcp || true
sudo ufw status
```

If the host is in a cloud VPC, also open inbound TCP `22` in the provider security group/network ACL.

### D) Validate from the Coolify host
Run these from the machine where Coolify is installed:
```bash
nc -zv <target-host> 22
ssh -o StrictHostKeyChecking=accept-new <ssh-user>@<target-host> 'echo ok'
```

If DNS is flaky, test with the server IP directly and use that IP in Coolify.

### E) Resolve host key mismatch after server rebuild
If target host was recreated with same IP/hostname, remove stale key on Coolify host:
```bash
ssh-keygen -R <target-host>
```
Then reconnect once to accept the new fingerprint.

### F) Quick decision tree
- `timeout`: wrong host/port, firewall closed, or no route from Coolify host.
- `permission denied`: wrong SSH user or missing public key in `authorized_keys`.
- `host key verification failed`: stale `known_hosts` entry; remove and re-accept key.

## 1) Shared services

Create these first so app environment variables can reference them.

### Postgres service
- Service type: `PostgreSQL`
- Version: `16`
- Database: `peopleflow`
- Username: `postgres`
- Password: generate strong secret
- Persistent volume: enabled

Expose these values for API wiring:
- `POSTGRES_HOST`
- `POSTGRES_PORT` (default `5432`)
- `POSTGRES_DB` (`peopleflow`)
- `POSTGRES_USER` (`postgres`)
- `POSTGRES_PASSWORD`

### Redis service
- Service type: `Redis`
- Version: `7` (or latest stable in Coolify)
- Persistent volume: enabled (recommended)

Expose these values for API wiring:
- `REDIS_HOST`
- `REDIS_PORT` (default `6379`)

## 2) API app (`apps/api`)

Create an application from GitHub repo with Dockerfile build.

- Source repo: `https://github.com/Arian1192/peopleflowHR.git`
- Branch: `main`
- Build method: `Dockerfile`
- Dockerfile path: `apps/api/Dockerfile`
- Port: `4000`
- Start command: default from Dockerfile (`npm run start`)

Environment variables:
- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=postgres://postgres:<POSTGRES_PASSWORD>@<POSTGRES_HOST>:5432/peopleflow`
- `REDIS_URL=redis://<REDIS_HOST>:6379`

Template: `apps/api/.env.coolify.example`

Health check:
- Path: `/healthz`
- Expected: HTTP `200` with `{ "ok": true }`

## 3) Web app (`apps/web`)

Create a second application from same repo.

- Source repo: `https://github.com/Arian1192/peopleflowHR.git`
- Branch: `main`
- Build method: `Dockerfile`
- Dockerfile path: `apps/web/Dockerfile`
- Port: `3000`
- Start command: default from Dockerfile (`npm run start`)

Environment variables:
- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>`

Where `<api-domain>` is the public URL/domain assigned to the API app.

Template: `apps/web/.env.coolify.example`

## 4) Networking and domains

- Assign domain/subdomain to API app (example `api.peopleflow.example.com`)
- Assign domain/subdomain to Web app (example `app.peopleflow.example.com`)
- Enable TLS in Coolify for both
- Ensure web app can reach API over HTTPS

## 5) First deployment order

1. Deploy Postgres service
2. Deploy Redis service
3. Deploy API app and confirm `/healthz`
4. Deploy Web app and confirm page loads and reports `api healthy`

## 6) Smoke checks

Run after first deploy:
- `GET https://<api-domain>/healthz` returns 200
- Open `https://<web-domain>` and verify runtime status is `api healthy`
- Validate API can connect to DB and Redis (no startup/runtime connection errors in logs)

## 7) Rollback guardrails

- Keep previous successful deployment artifact/tag in Coolify
- For failed rollout:
  - rollback Web to previous healthy deployment
  - rollback API to previous healthy deployment
- Do not rotate Postgres volume during app rollback
