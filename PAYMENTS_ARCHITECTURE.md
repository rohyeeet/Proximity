# Payments Architecture (as-built)

This is the **current, as-implemented** reference for Proximity Pay — what actually exists in the
codebase today, not the aspirational spec. For the full original design rationale (glossary,
competitive landscape, regulatory detail, the reasoning behind every mechanism), see
[`CARBON_MARKETS_PAYMENTS_INFRA_DESIGN.md`](./CARBON_MARKETS_PAYMENTS_INFRA_DESIGN.md) — that
document is kept as-is; this one is the map for picking the real code back up.

## 1. Domain model

```
Project
   │
   ├── MilestoneTemplate (authored once, per project — % of the deal + who-gets-paid split)
   │      └── MilestoneTemplateSplit (per-role %: platform / developer / farmer_community / investor)
   │
   └── PaymentAgreement (a real buyer deal — buyer name, total value, currency, escrow/FX policy)
          ├── Milestone (snapshotted from a MilestoneTemplate at agreement-creation time —
          │      sourceTemplateId records which one; a later template edit never retroactively
          │      changes a signed agreement)
          │      ├── SplitRule (this milestone's own snapshotted split — different milestones on
          │      │      the same agreement can pay different roles different percentages)
          │      ├── MilestoneClaim (a ground partner's claimed amount + evidence)
          │      │      ├── EvidenceAttachment
          │      │      └── StakeholderConsent (one per required role: investor / platform_ops / registry)
          │      └── PayoutInstruction (one per revenue-split participant, gate-checked)
          │             └── GateOverride (dual sign-off, when KYC/BAV blocks a payout)
          ├── PaymentAgreementParty (grants an investor/registry User access — not an OrgMembership)
          ├── PayoutRecipient (a developer/farmer-community recipient's KYC/BAV status)
          ├── EscrowAccount (held balance; interest computed live, never a stale stored number)
          └── PaymentAuditLogEntry (hash-chained, append-only — one chain per agreement)
```

`SplitRule.milestoneId` is nullable: `null` means an agreement-wide split (how every agreement
worked before templates existed — a handful of legacy seed rows still use this), set means a
per-milestone split (how every agreement built through the current builder works). Both are
handled by every read path (see §3).

## 2. Lifecycle

1. **Author the structure, once, before any real deal exists.** An org editor defines a project's
   milestones on the Payment Structure tab — each one's % of total deal value and its role split —
   summing to 100% across the project. This is the one lever; nothing about a real buyer or dollar
   amount is entered here.
2. **Build a real agreement.** The builder (`/payments/new`) picks a project, sets the deal's real
   terms (buyer, total value, currency, escrow/FX policy), and checks off which of that project's
   milestones apply. Each checked milestone is **snapshotted** into a real `Milestone` + its own
   `SplitRule` set — never a live reference to the template.
3. **Activate.** Funds "enter escrow" (simulated buyer-collection leg — see §4).
4. **Claim.** A ground partner submits a claim on a milestone: a claimed amount plus evidence
   (photo, production log, registry export, ...).
5. **Consent.** Every required stakeholder for that milestone type (investor, platform ops, and —
   for monitoring-cycle milestones — the registry) records consent on that specific claim. A
   claimant can never also consent on their own claim (segregation of duties, enforced server-side).
6. **Gate check.** Once every required consent is in, the revenue-split engine computes each
   participant's share and creates one `PayoutInstruction` per role, each independently gated on
   that role's recipient's KYC/BAV status.
7. **Override (if blocked).** A blocked payout can be released via dual authorization — both the
   ground partner and the investor must sign off, never a single approver.
8. **Release.** Ops releases a ready payout through the PSP seam (§4) — deducts from escrow, records
   a settlement reference.
9. **Audit.** Every step above appends a hash-chained entry to that agreement's audit log; a
   "Verify chain" action recomputes every hash live and confirms nothing was altered.

## 3. Access model — who sees what

`resolveLedgerViewerRole` (`src/lib/permissions.ts`) resolves one of five viewer roles for the
agreement detail page and gates the Payments module's own tabs:

| Viewer | Resolution | What they see |
|---|---|---|
| **manager** | platform admin, or org tier `org_admin`/`org_sub_admin` | Full agreement detail (terms, revenue split, escrow) *and* the Payment Structure / Ledger surfaces |
| **investor** | a `PaymentAgreementParty` with role `investor` | `PaymentLedgerSummary`: escrow held/core/interest + total released, never another role's split % |
| **registry** | a `PaymentAgreementParty` with role `registry` | A one-line role note only — registries verify monitoring-cycle milestones, they don't receive money |
| **farmer_community** | org tier `submitter` | Their own role's allocation/disbursed/pending, filed via Collect |
| **developer** | any other org member (reviewer/designer/viewer tier) | Same shape as farmer_community, developer role |

Everyone except **manager** is also excluded from the Payment Structure tab and the Ledger entirely
— those surface every role's split %, which is deal-structuring config for the org's own management,
not something an external party or non-management org member should see. This is enforced twice: in
the UI (`PaymentsPageClient` never renders the tab) and again server-side (`requireOrgEditAccess` on
the underlying `/api/projects/:id/milestone-templates` and `/api/milestone-templates/:id/ledger`
routes) — the UI gate is a convenience, the API gate is what actually matters.

## 4. The PSP seam

`src/lib/proximity-pay.ts` defines a `PaymentServiceProvider` interface — `quote` / `route` /
`settle` — with one implementation today, `SimulatedPaymentServiceProvider`. No real money moves;
every payout reference and settlement is a simulation. This is deliberate, not a placeholder to
apologize for: the claim → consent → gate → payout lifecycle needed to be provably correct *before*
any real PSP integration, licensing, or compliance work begins.

The seam is the point: swapping in a real provider (Stripe Connect/Treasury, Modern Treasury, or a
direct banking-rail partner) means implementing this one interface — every call site already goes
through it, nothing upstream needs to change. This platform's own logic is the
verification-and-business-rule layer that *triggers* a transfer; actually moving money is
deliberately left to a licensed provider rather than something to build in-house (see the design
doc's §2 for why becoming a licensed PSP doesn't pay for itself at this market's size).

## 5. The redesigned UI (this pass)

Payments used to be three tabs (Milestone templates, Ledger, Agreements) plus a separate builder
page, each independently re-selecting the same project and re-showing the same %/split data. That's
now:

- **One project selection**, synced to the URL (`?project=`) at the top of `/payments`, shared by
  both tabs and carried straight into `/payments/new?project=...` so the builder never asks again.
- **"Payment Structure" tab** — the old Milestone templates + Ledger tabs, merged: each milestone
  card shows its own definition (label, %, type, verification source — with a plain-language
  one-liner, `VERIFICATION_SOURCE_HELP`) and role-split chips up front, with a **"View live ledger"**
  row that expands in place (no tab switch) to show that exact milestone's live
  allocated/disbursed/pending rollup.
- **"Agreements" tab** — unchanged list/detail, except the builder now shows a one-line "Building
  for `{project}`, `{org}` · Change" instead of two dropdowns when it already knows the project, and
  its milestone checklist is a compact label/%/checkbox list with a "Review full definitions →" link
  back to Payment Structure instead of re-showing every split chip a second time.

Components: `PaymentsPageClient.tsx` (tabs + URL state) → `PaymentStructureTab.tsx` (definition +
inline ledger, supersedes the old `MilestoneTemplatesClient`/`PaymentsLedgerTab`) and
`PaymentsListClient.tsx`/`PaymentAgreementBuilderClient.tsx`/`PaymentAgreementDetailClient.tsx`
(agreements). `PaymentStepLedgerPanel.tsx` is the one live-ledger renderer, reused both inline in
Payment Structure and inside Flow Studio's `payment_step` node inspector — one component, two
mounting points, never a third re-implementation.

## 6. Generalizing beyond carbon (roadmap, not built yet)

Milestones and splits are already a generic conditional-payout primitive — "release X% of a total
once a condition is verified" applies just as well to results-based development aid, conservation
performance payments, supply-chain financing, or parametric insurance as it does to carbon. The
natural next step, not implemented in this pass: **rule-based splits**, using the same
`FlowEdgeCondition` evaluator already built for flow branching (`src/lib/flow-conditions.ts`) to let
a milestone's split — or even its own %, or whether it's due at all — resolve from a real business
rule against submitted data (e.g. "if `quality_score > 90`, farmer share = 30%, else 25%") instead of
always being a flat, hand-entered percentage. The schema already anticipates this: `SplitRule` and
`Milestone` are independent rows keyed by role/type, not hard-coded fields, so adding a rule-driven
alternative to a flat percent is a real but scoped extension, not a rewrite.
