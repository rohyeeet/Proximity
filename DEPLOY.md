# Deploying Proximity

The app is a standard Next.js 15 (App Router) project backed by PostgreSQL via Prisma, with
Auth.js (Credentials) for login. This doc gets it from "code on your machine" to "live URL."

## 1. Get a Postgres database

Any of these work with zero code changes (it's all just `DATABASE_URL`):

- **[Neon](https://neon.tech)** — free tier, serverless Postgres, ~2 minutes to create a project.
- **Vercel Postgres** — created directly from your Vercel project's Storage tab (this is Neon
  under the hood).
- Supabase, RDS, or any other managed Postgres.

Copy the connection string it gives you.

## 2. Configure environment variables

Copy `.env.example` to `.env` locally, and set the same two variables in your hosting
provider's dashboard for production:

- `DATABASE_URL` — from step 1.
- `AUTH_SECRET` — generate with `npx auth secret` (or `openssl rand -base64 32`). Use a
  **different** value in production than in local dev.

## 3. Run migrations and seed data

```bash
npm install                # also runs `prisma generate` via postinstall
npx prisma migrate dev     # creates the schema (local/dev — creates a new migration if needed)
npm run db:seed            # loads every domain pack, org, form, flow, and submission from src/data/*.ts
```

For production, migrations are applied without prompting for a new migration name:

```bash
npx prisma migrate deploy
```

Run this once against the production `DATABASE_URL` before or during your first deploy (Vercel
lets you run it as part of the build command, e.g. `prisma migrate deploy && next build`, or
as a one-off from your machine pointed at the prod database).

## 4. Deploy to Vercel

1. Push this repo to GitHub/GitLab.
2. Import it in Vercel → it auto-detects Next.js.
3. Add the `DATABASE_URL` and `AUTH_SECRET` env vars in the project's Settings → Environment
   Variables.
4. (Recommended) Set the build command to `prisma migrate deploy && next build` so schema changes
   ship automatically with each deploy.
5. Deploy. Vercel runs `npm install` (triggering `prisma generate`) and then the build command.

## 5. Log in

Every user seeded from `src/data/identity.ts` can sign in with their real email and the shared
demo password (`demo1234` unless you set `SEED_DEMO_PASSWORD`). The login page lists a few to try
— they demonstrate different roles (Super Admin, Org Admin, Reviewer, Submitter), which is the
easiest way to see the RBAC view-only experience for real.

## What's still a prototype boundary

See §8 of the architecture write-up for the full list — the short version: file uploads
(photo/document-scan/signature fields) aren't wired to real storage yet because there's no
end-user "fill out this form" runtime to attach them to, and the Analytics dashboards
intentionally still read curated static sample data rather than live aggregation queries.
