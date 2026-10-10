# Didar CI/CD

Frontend: `saeed-jamshid/didar-front`, branch `main`.
Backend: `saeed-jamshid/Didar-back`, branch `master`, source `../Didar-back`.
Domain: `didarplace.ir`. Owner manages visitor HTTPS/CDN; origin HTTP matches Pal.

## GitHub environment `production` (both repos)

Secrets: `DEPLOY_SSH_KEY` (dedicated Didar key), `DEPLOY_KNOWN_HOSTS` (VPS host key verified through existing SSH connection).
Variables: `DEPLOY_HOST=130.185.76.124`, `DEPLOY_USER=deploy`, `DEPLOY_PORT=22`, `DEPLOY_ENABLED=true` after verified provisioning/import. Set `false` to pause deployment; exactly `true` enables it.

Push/PR runs CI. Only main/master pushes or manual runs on those branches can deploy; PRs cannot deploy. Pinned checkout/setup/artifact actions. Serialized workflows plus host filesystem locks. Archives/images have SHA256 checksums; private env files are not packaged. Front uses committed npm lockfile/Node 22, lint (non-mutating), typecheck, isolated rollback checks, Next standalone build. Backend uses Python 3.14/Django 6, only runtime dependencies imported by this app (no Pal Redis/Celery), Docker build, PostgreSQL 16 API tests, migration drift check and isolated rollback checks.

## VPS layout (separate from Pal)

- `/opt/didar/front/{incoming,releases,shared}`, `current` symlink, PM2 app `didar-front`, loopback **3006**.
- `/opt/didar/back/{incoming,releases,shared}`, `current` symlink, Compose project `didar-production`, web loopback **8092**.
- PostgreSQL 16 volume `didar-production_db_data`, no host DB port.
- `back/shared/{app.env,db.env}` mode600, generated secrets, DB `cafe_db`/user `cafe_user`.
- `back/shared/{media,staticfiles}` persistent; releases never contain data.
- `back/shared/backups` private encrypted pre-migration snapshots. Reuses `/etc/vinext/backup.recipient` and existing offline age recovery key. Never put private recovery key in GitHub.

## One-time setup/import

1. Root runs backend `ops/setup-vps.sh <dedicated-public-key-file>`. Requires existing deploy account/Docker access, Node22/PM2, curl/tar/flock/python3/age, existing Pal backup recipient. Refuses existing `/opt/didar` or occupied ports. Adds only dedicated SSH public key; generates env files without printing secrets. Does not start apps or edit proxy/TLS/CDN.
2. Transfer original trusted `backup/backup_2026-10-10_20-37-34/{database.sql,media,metadata.json}` privately to VPS. Generate `SHA256SUMS` for every backup file before transfer, verify remotely. Backup contains user/password hashes: never commit/upload as public CI artifact.
3. As deploy, run backend `ops/restore-initial.sh <backup-directory> <docker-compose.prod.yml>`. Requires empty isolated DB/media; verifies hashes, imports SQL with `ON_ERROR_STOP` + single transaction, copies media, writes `shared/restore.complete`. Never called from CI. Never restores over live data or reruns automatically. If media copy fails after SQL commit, stop and recover manually; rerun correctly refuses populated DB.
4. Verify expected backup counts: **13 categories, 117 items, 61 media files; all 40 nonempty DB image references present** (local restore verified). Verify admin credentials privately; no default admin/password created. Keep original backup offline/private.
5. Enable/backend workflow first, verify APIs. Then enable/frontend workflow, verify page. Existing PM2-deploy startup service must be active so saved frontend survives reboot.
6. Root runs backend `ops/install-proxy.sh`. Refuses existing Didar server block; checks both apps, adds ONLY Didar HTTP-origin config, validates Nginx and reloads. Failure removes new config/reloads prior setup. `/api/` + `/admin/` → Django; `/media/` + `/static/` → persistent files; `/` → Next. No Pal/TLS/CDN changes.
7. Verify public HTTPS homepage/API/admin redirects, pagination URLs and media. Owner must restrict HTTP origin to trusted CDN and require visitor HTTPS. Nginx overwrites `X-Forwarded-Proto`; Django trusts proxy only because web is loopback-bound. HSTS/HTTPS redirect are CDN-owned; `check --deploy` warnings for these remain visible, not treated as failures.

Current checkpoint (2026-10-10): both GitHub CI/CD deployments passed and `DEPLOY_ENABLED=true`; frontend3006 and backend8092 are live on loopback. Original backup restored/verified on isolated PostgreSQL16; encrypted pre-migration snapshot retained. PM2 startup active; Pal front/backend healthy. Owner installed Didar HTTP-origin Nginx route but **main domain/CDN cutover is deferred**; public domain still showed old build at inspection. TLS/CDN unchanged. Local lint/typecheck/build, fresh Docker/API/drift/no-secrets checks, mocked rollback and backup checksum/reference checks passed.

## Temporary public IP preview

Owner selected read-only HTTP preview: `http://130.185.76.124:8086` (unencrypted; no admin/login). Source `ops/didar-preview.conf`; root runs `ops/install-preview.sh`, staged with config in `/home/saeed/didar-setup`. Requires another interactive sudo command. Installer only adds8086 listener and, if UFW already active, allows8086/tcp; never changes main-domain route, TLS/CDN or disables firewall. External provider firewall may need owner approval too.

Preview routes page/API/media/static together, blocks `/admin` + `/admin/` (404) and non-GET/HEAD requests (403). Backend canonical Host stays `didarplace.ir`, schemeHTTP; client rebases API pagination/image URLs to current browser origin when public API base is empty. Explicit separate API base retains original URLs. HTTPS production still uses Next image optimization; HTTP preview uses original images (larger files). Unit checks cover both schemes/explicit base/null media/fetch errors; local real-browser preview checked13categories, paginated items, loaded images, same-origin requests, no JS errors, admin404/write403. Do not use public HTTP for credentials or sensitive data.

Remove preview after domain cutover: remove only `/etc/nginx/sites-enabled/didar-preview.conf` and `/etc/nginx/sites-available/didar-preview.conf`, run `nginx -t && systemctl reload nginx`; remove specifically added8086/tcp UFW rule if applicable. Do not remove main Didar/Pal configs or persistent data.

## Rollback/operations

Frontend recreates only PM2 `didar-front` against absolute release path, health checks page + backend APIs, restores old release on failure (first failure removes app). Brief interruption possible; not zero-downtime.
Backend snapshots DB/env/media **before** migrations, migrates/collects static, starts verified image and checks both public APIs. Failure restores prior **code**, never automatically reverses migrations or overwrites DB/media. First activation failure stops web; DB/media retained. Incompatible migrations require operator recovery with offline age key + tested DB/media restore, not blind code rollback.

For manual code recovery, select prior successful release from logs; use same activation commands in respective deploy script, update `current` atomically, verify health; frontend `pm2 save`. Do not rerun deploy script with an existing release ID (it intentionally refuses). Never delete persistent DB/media. Releases/backup snapshots retained; monitor disk (VPS had ~19GB free at inspection). No automatic pruning or scheduled backups added; predeploy snapshots do not protect edits made between deployments.

Check scripts without live services:

```sh
npm run lint && npm run typecheck && npm run test:deploy && npm run test:api
# ../Didar-back:
bash -n ops/*.sh
bash ops/test-deploy-back.sh
```

Backend Docker build context is allowlisted; tracked historical venv/DB/media are not copied. Both tracked `.env` files removed from new commits only; old backend credentials remain in Git history and must be rotated if still valid. No history rewrite performed.
