# Deploying Proximity

The app is a standard Next.js 15 (App Router) project backed by PostgreSQL via Prisma, with
Auth.js (Credentials) for login. Nothing in the code is tied to a specific host — pick whichever
path below fits. Both need the same environment variables:

- `DATABASE_URL` — a standard Postgres connection string.
- `AUTH_SECRET` — generate with `npx auth secret` (or `openssl rand -base64 32`). Use a
  **different** value per environment.
- `BLOB_READ_WRITE_TOKEN` — only needed for photo/document-scan/signature capture. Currently
  Vercel-Blob-specific (Option B/Cloud Run can run without it — those field types just won't
  upload — or swap in any S3-compatible client behind the same `src/app/api/uploads/route.ts`).

Copy `.env.example` to `.env` for local dev regardless of which path you deploy to.

---

## Option A — Vercel + Neon/Vercel Postgres (quickest)

1. **Get a database.** [Neon](https://neon.tech) (free tier, ~2 minutes) or a Vercel Postgres
   store created from your Vercel project's Storage tab — same thing either way, it's just
   Postgres.
2. **Get a Blob store** (for media capture) — same Storage tab, "Create Database" → Blob. Its
   `.env.local` tab shows the token to copy.
3. **Push this repo to GitHub/GitLab**, then import it in Vercel (auto-detects Next.js).
4. Add `DATABASE_URL`, `AUTH_SECRET`, and `BLOB_READ_WRITE_TOKEN` in Settings → Environment Variables.
5. Set the build command to `prisma migrate deploy && next build` so schema changes ship with
   every deploy.
6. Deploy. Vercel runs `npm install` (triggering the `postinstall: prisma generate` script) and
   then your build command.
7. Seed it once: `DATABASE_URL="<your prod url>" npm run db:seed` from your machine (or a one-off
   Vercel CLI/Cloud Shell run).

## Option B — Google Cloud (Cloud Run + Cloud SQL)

This repo includes a `Dockerfile` (multi-stage, Next.js `output: "standalone"`, Prisma engine
binaries copied explicitly — the one thing Next's standalone tracer commonly misses).

1. **Create a Cloud SQL for PostgreSQL instance** (Console → SQL → Create Instance, or
   `gcloud sql instances create`). Note its **connection name**:
   `PROJECT_ID:REGION:INSTANCE_ID`.
2. **Build and push the image** to Artifact Registry:
   ```bash
   gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/REPO/proximity
   ```
3. **Deploy to Cloud Run, attaching the Cloud SQL instance** (this mounts a Unix socket at
   `/cloudsql/<connection name>` — no VPC connector or public IP needed):
   ```bash
   gcloud run deploy proximity \
     --image REGION-docker.pkg.dev/PROJECT_ID/REPO/proximity \
     --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_ID \
     --set-env-vars AUTH_SECRET=your-secret \
     --set-env-vars DATABASE_URL="postgresql://USER:PASSWORD@localhost/DBNAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_ID" \
     --allow-unauthenticated
   ```
   (Prefer Secret Manager over `--set-env-vars` for `AUTH_SECRET`/`DATABASE_URL` in a real
   deploy — `--set-secrets` instead of `--set-env-vars` once they're stored there.)
4. **Run the migration once** against that same `DATABASE_URL`. Easiest from Cloud Shell (which
   can reach Cloud SQL via the Auth Proxy) or as a one-off **Cloud Run Job** built from the same
   image with `CMD ["npx", "prisma", "migrate", "deploy"]`:
   ```bash
   gcloud run jobs create proximity-migrate \
     --image REGION-docker.pkg.dev/PROJECT_ID/REPO/proximity \
     --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_ID \
     --set-env-vars DATABASE_URL="..." \
     --command npx --args prisma,migrate,deploy
   gcloud run jobs execute proximity-migrate
   ```
5. **Seed it** the same way, swapping the job's command for `npm,run,db:seed`.

### Local Docker build (either path, to sanity-check the image before pushing)

```bash
docker build -t proximity .
docker run -p 8080:8080 --env-file .env proximity
```

---

## Log in

Every user seeded from `src/data/identity.ts` can sign in with their real email and the shared
demo password (`demo1234` unless you set `SEED_DEMO_PASSWORD`). The login page lists a few to try
— they demonstrate different roles (Super Admin, Org Admin, Reviewer, Submitter), which is the
easiest way to see the RBAC view-only experience for real.

## What's still a prototype boundary

- **geo_boundary** capture records an ordered list of GPS points (tap "Add point" while walking a
  perimeter) — there's no live map rendering of the boundary in this pass.
- **device_telemetry / external_db lookups** are still placeholders (clearly labeled "not yet
  connected") — only "pick a prior submission" (internal_form) lookups and linked records are real.
- The Analytics dashboards intentionally still read curated static sample data rather than live
  aggregation queries.
