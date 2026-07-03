# Proximity

Proximity is an MRV (Measurement, Reporting, Verification) platform for climate and carbon
programs. It lets an organization — a biochar producer, a green hydrogen plant, an ARR (afforestation
/ reforestation / revegetation) collective — model their entire data-collection and verification
process (what gets recorded, in what order, by whom, reviewed by whom) as configuration, not code,
and then actually run that process: field teams submit real records, reviewers approve or return
them, and every submission stays tied to the exact form definition it was collected under, forever.

It is multi-tenant (`Organization`), multi-domain (`DomainPack` — biochar and green hydrogen are the
two shipped today), and role-gated end to end, from the UI down to the database write.

## Contents

- [What it does](#what-it-does)
- [System architecture](#system-architecture)
- [Domain model](#domain-model)
- [User personas & permissions](#user-personas--permissions)
- [Features](#features)
- [Usage walkthrough](#usage-walkthrough)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Deployment](#deployment)
- [Prototype boundaries](#prototype-boundaries--roadmap)

## What it does

A carbon program has to prove, years later, exactly what was measured, by whom, under what
definition, and that nothing was quietly changed after the fact. Proximity is built around that
constraint:

- **Studio** — build the process itself: the *Stages* it moves through, the *Forms* captured at
  each stage, and the *Flow* (a visual graph) that ties them together with review gates, branches,
  and correction loops.
- **Connectors** — register the data sources a form can pull from or push to: internal lookups,
  external databases/REST APIs, or industrial protocols (OPC-UA, Modbus, MQTT/Sparkplug B) feeding
  live telemetry from devices.
- **Records** — every submission against a published form, reviewable (approve / return for
  correction), and rendered against the *exact* field definitions it was submitted under — even
  after the form has since changed.
- **Analytics** — program-level rollups (throughput, review backlog, telemetry health).
- **Admin** — platform-tier oversight across every organization and domain pack.

## System architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                 │
│  Next.js App Router (React 19) — Server Components fetch via Prisma,    │
│  Client Components mutate via fetch() against Route Handlers            │
└───────────────┬───────────────────────────────────────────┬─────────────┘
                │                                            │
        Server Components                              Route Handlers
        (initial page data)                         (src/app/api/**/route.ts)
                │                                            │
                ▼                                            ▼
        src/lib/queries.ts  ───────────────────────►  src/lib/authz.ts
        (read-side Prisma)                             (session + RBAC check
                │                                        on every mutation)
                │                                            │
                └────────────────────┬───────────────────────┘
                                     ▼
                            src/lib/db.ts (Prisma client)
                                     │
                                     ▼
                         PostgreSQL (Neon, serverless)
```

- **Auth**: Auth.js v5 (Credentials provider), bcrypt-hashed passwords, JWT session. `middleware.ts`
  redirects unauthenticated requests to `/login`; `src/app/(app)/layout.tsx` resolves the session
  server-side and hydrates the client `SessionProvider`/`StudioProvider`.
- **Client state**: `src/lib/studio.tsx` holds Stages/Forms/Flows in React Context, seeded from the
  server on load. Edits apply optimistically and flush to the database via a 600ms-debounced
  `PATCH`, so typing feels instant but every keystroke doesn't fire a request.
- **Authorization is enforced twice, on purpose**: client components hide edit affordances a role
  shouldn't see (UX), and every mutating Route Handler independently re-checks via
  `src/lib/authz.ts` (security) — hiding a button never stops a direct API call.
- **Persistence**: JSONB is used deliberately (not as a shortcut) for structures that are always
  read/written as one unit and never queried field-by-field in SQL — form field definitions, flow
  node/edge graphs, submission answers. Everything that's ever filtered, joined, or counted in SQL
  (ids, statuses, foreign keys, sort order) is a real column.

## Domain model

```
DomainPack ("Biochar — Isometric & Puro", "Green Hydrogen — Electrolysis to Certification")
   │
   ├── Organization (a tenant running that domain's process — e.g. "Varaha South")
   │      ├── Role (tiered permission sets, some org-wide, some scoped to a project cluster)
   │      ├── OrgMembership (a User ⇄ Role binding, per org)
   │      └── Connector (a registered data source, org-scoped) ── Device ── TelemetryStream
   │
   ├── Stage (an ordered step in the process — "Feedstock Intake", "Pyrolysis Run", ...)
   │      └── owns an ordered list of FormTemplate ids and Connector ids
   │
   ├── FormTemplate (a reusable form definition — "Facility Setup", "Sample Intake COA")
   │      └── FormTemplateVersion (append-only history: "draft" while being edited,
   │           "published" and immutable forever once published — never mutated again)
   │
   ├── FlowTemplate (the visual graph tying Stages/Forms/reviews/automation together)
   │      └── FlowNodeDefinition[] / FlowEdgeDefinition[] — kept in sync with Stages by
   │           the sync engine (src/lib/flow-sync.ts), but hand-editable beyond that backbone
   │
   └── Submission (a real record — pinned to the FormTemplateVersion it was submitted under,
          so answers always render against the fields that existed at submission time,
          regardless of how many times the form has been republished since)
```

**Why versions matter**: publishing a form doesn't overwrite anything. The current draft flips to
`published` and becomes permanent history; the next edit opens a brand-new draft row. A submission
from v1 keeps rendering against v1's exact fields even after the form is on v5 — Records shows a
banner when a submission's pinned version is stale relative to the form's current version, and
`Notification` rows are fanned out to every past (non-test) submitter plus the publisher whenever a
form changes.

## User personas & permissions

Permission is a **tier** (`RoleTier`), not a single global toggle — a user's tier can differ per
organization membership, and platform tier is cross-org.

| Tier | Example role (seeded) | Can edit Studio? | Can delete a Stage? | Notes |
|---|---|:---:|:---:|---|
| `platform` | Super Admin | ✅ | ✅ | Cross-org, not tied to any one `OrgMembership`. |
| `org_admin` | Org Admin | ✅ | ✅ | Full control of one organization. |
| `org_sub_admin` | Regional Ops Sub-Admin | ✅ | ❌ | Delegated admin scoped to a project cluster; can build but not destroy. |
| `designer` | — | ✅ | ❌ | Studio-editing only, no admin actions. |
| `reviewer` | Lab Technician, Plant QA Engineer | ❌ (view-only) | ❌ | Approves/returns submissions. |
| `submitter` | Field Surveyor | ❌ (view-only) | ❌ | Fills out forms in the field. |
| `viewer` | — | ❌ | ❌ | Read-only across the board. |

Stage deletion is deliberately **stricter** than general Studio editing (`canDeleteStage` vs.
`canEditStudio` in `src/lib/permissions.ts`) — irreversible actions are gated to admin tiers only,
confirmed via a modal, enforced server-side in `requireStageDeleteAccess`.

Every persona above is real seed data (`src/data/identity.ts`) and logs in with their real email +
the shared demo password — see [Local development](#local-development).

## Features

### Studio
- **Stage board** — ordered stages, each owning a set of forms and connectors; reorder, rename
  inline (pencil-icon editing, not "everything looks editable"), delete (admin-only, confirmed).
- **Form builder** — drag-in field types (text, number, date, geo-point/boundary, photo, document
  scan, signature, lookup, linked record, calculated field, repeat group), validation rules,
  conditional visibility rules, lookup sources bound to Connectors, link filters between forms.
  - **Preview** — live render of the form as an end user would see it, with a **Desktop/Mobile**
    viewport toggle, and a **Submit test response** action that creates a real, isolated test
    `Submission` (never appears in Records or production counts) so a form can be validated before
    it's published.
- **Flow Studio** — a `@xyflow/react` canvas for the process graph: form steps, branches, review
  gates, correction loops, automations, parallel groups, waits, documents, explicit `start` and
  `milestone` (terminal) nodes. Bigger nodes and connection handles, a collapsible module palette,
  **contextual "suggested next step" buttons** in the node inspector (e.g. a review gate suggests
  a correction loop, a document, or a milestone), a **fullscreen mode** for building large graphs,
  auto-arrange (layered topological layout), and structural validation (dangling edges, unmarked
  cycles, unreachable nodes, missing start/milestone nodes, branches with fewer than two paths).
  "Sync from stages" reconciles the flow's backbone with the current Stage list without discarding
  hand-built detours like review gates.
- **Knowledge base** — inline contextual help (`InfoHint`/`KnowledgeDrawer`) explaining Studio
  concepts without leaving the builder.

### Connectors
Register internal lookups, external database/REST sources, or industrial-protocol devices
(OPC-UA / Modbus / MQTT-Sparkplug B) that forms can bind to for live dropdowns or telemetry-fed
automation. Each connector rolls up its bound `Device`s and their `TelemetryStream`s.

### Records
Every submission, reviewable with an approve / return-for-correction workflow, review history, and
evidence attachments — rendered against the exact form-field definitions it was submitted under.

### Notifications
A bell in the top bar with an unread-count badge. Publishing a form fans out a notification to every
past real submitter ("this form changed, your data is safe under its original version") and a
confirmation to the publisher.

### Analytics & Admin
Program-level throughput/backlog/telemetry dashboards, and a platform-admin view across every
organization and domain pack.

## Usage walkthrough

**Building a process (Org Admin / Designer):**
1. Forms & Stages → **New stage** for each step of the real-world process.
2. Inside a stage, **New form** (or add an existing one) and build its fields in the Form Builder.
3. Use **Preview** to sanity-check the form (including on a simulated mobile viewport) and submit a
   few test responses before publishing.
4. **Publish** the form — this is the point its fields become immutable history.
5. Flows → open the domain's flow → **Sync from stages** to lay the Stage/Form backbone into the
   graph automatically, then hand-add review gates, branches, or correction loops using the
   palette or the inspector's "Suggested next steps." **Validate graph**, then **Publish**.

**Running the process (Submitter / Reviewer):**
1. A submitter fills out a published form (Records currently seeds/reads this data; a live
   submitter-facing fill-and-submit runtime is the next phase — see [Roadmap](#prototype-boundaries--roadmap)).
2. A reviewer opens the submission in Records, approves it or returns it for correction with a
   reason and guidance.
3. If the underlying form is later republished, the reviewer and the original submitter are both
   notified, and the original submission keeps rendering against the version it was actually
   collected under.

**Administering connectors:** Connectors → **Add connector** → name it, pick its type (and protocol,
if industrial), optionally set an endpoint → bind it to a stage or a form's lookup source.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Flow canvas | `@xyflow/react` |
| Charts | Recharts |
| Database | PostgreSQL (Neon), Prisma ORM v6 |
| Auth | Auth.js v5 (Credentials, JWT sessions), bcryptjs |
| Deployment targets | Vercel, or Docker → Google Cloud Run + Cloud SQL |

## Project structure

```
src/
  app/
    (app)/            authenticated route group — Studio, Records, Connectors, Analytics, Admin
      layout.tsx       resolves the session + hydrates SessionProvider/StudioProvider server-side
    api/               Route Handlers — every mutation re-checks authz independently of the client
    login/             Auth.js Credentials sign-in page
  components/
    layout/            AppShell, Sidebar, Topbar, NotificationBell
    studio/            Stage board, Form builder, Flow canvas + inspector + node catalog
    records/           Submission detail/review UI
    connectors/         Connector creation
    ui/                Shared primitives (Button, Modal, StatusChip, EditableText, ...)
  lib/
    db.ts              Prisma client singleton
    auth.ts            Auth.js config
    authz.ts           Server-side RBAC checks, one per mutation shape
    permissions.ts      Pure tier-membership predicates (canEditStudio, canDeleteStage)
    studio.tsx         Client Context: optimistic edits + debounced persistence
    queries.ts / mappers.ts   Read-side Prisma queries and Prisma-row → TS-type mappers
    flow-sync.ts       Reconciles a Flow's backbone with its Stage list
    graph-utils.ts     Layered auto-layout + structural flow validation
    notifications.ts   Fans out Notification rows on form publish
  data/                Hand-authored seed/mock content — the single source of truth the
                       seed script inserts into Postgres from (never hand-transcribed twice)
  types/               One file per domain concept, mirrored field-for-field by prisma/schema.prisma
prisma/
  schema.prisma        Full data model
  seed.ts              Idempotent upsert of everything in src/data/** into Postgres
```

## Local development

```bash
cp .env.example .env        # set DATABASE_URL (any Postgres) and AUTH_SECRET
npm install                 # postinstall runs `prisma generate`
npm run db:migrate           # applies prisma/migrations
npm run db:seed              # inserts every seeded org/user/stage/form/flow/submission
npm run dev
```

Every seeded user signs in with their real email and the shared demo password `demo1234` (override
with `SEED_DEMO_PASSWORD`). The login page lists a few to try — logging in as different personas is
the fastest way to see the RBAC view/edit boundaries for real. `npm run db:studio` opens Prisma
Studio to inspect the database directly.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for full steps. Short version: both paths need `DATABASE_URL` and a
per-environment `AUTH_SECRET`.

- **Vercel** — import the repo, add the two env vars, set the build command to
  `prisma migrate deploy && next build`, deploy, seed once from your machine.
- **Google Cloud (Cloud Run + Cloud SQL)** — this repo ships a multi-stage `Dockerfile`
  (`output: "standalone"`, Prisma engine binaries copied explicitly). Attach Cloud SQL via its Unix
  socket, run the migration once as a Cloud Run Job, then deploy.

## Prototype boundaries & roadmap

Flagged explicitly rather than silently glossed over:

- **No live submitter-facing "fill and submit" runtime yet.** The Form Builder's Preview panel can
  create real, isolated test submissions, and Records reads real `Submission` rows, but there's no
  public field-collection app yet — see the in-app **mobile strategy note** for the phased plan
  (responsive/PWA form-fill runtime → offline queueing using the `SyncStatus` states already
  modeled — `saved_offline` / `ready_to_sync` / `synced` / `sync_failed` — → field-specific polish
  like GPS-boundary walking and biometric device lock).
- **File uploads** (photo / document-scan / signature fields) aren't wired to real blob storage yet
  — that depends on the submitter runtime above existing first.
- **Analytics** reads curated seed data rather than live aggregation queries.
