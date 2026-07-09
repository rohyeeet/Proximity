/**
 * Hash-chained, append-only audit log for a payment agreement: each entry stores a hash of itself
 * plus the previous entry's hash, so the sequence is tamper-evident without a public blockchain
 * (design doc §18). This chains the *process* (claims, consents, gate checks, payouts) — never the
 * underlying carbon credit itself, which this platform deliberately never tokenizes.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { genId } from "@/lib/utils";
import { toPaymentAuditLogEntry } from "@/lib/mappers";
import type { PaymentAuditLogEntry } from "@/types";

export const GENESIS_HASH = "0".repeat(64);

/** Deterministic JSON serialization (object keys sorted recursively) — Postgres's `jsonb` column
 * type does not preserve object key insertion order on round-trip, so hashing a plain
 * `JSON.stringify(payload)` would make `verifyAuditChain` spuriously report tampering on an
 * untouched entry purely because the DB reordered keys. Hashing a canonical form instead makes
 * verification correct regardless of storage layer. */
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Exported so prisma/seed.ts can build a genuinely valid hash chain for seeded demo audit
 * entries too — a hand-authored chain the "Verify chain" button would flag as broken defeats the
 * point of seeding a realistic demo. */
export function computeHash(previousHash: string, eventType: string, payload: unknown, timestamp: string): string {
  return createHash("sha256").update(`${previousHash}:${eventType}:${canonicalStringify(payload)}:${timestamp}`).digest("hex");
}

/** Appends one entry to an agreement's audit trail. Must be called with the same `tx` as the
 * mutation it's recording where one is in flight, so the log entry and the state change it
 * describes always land together. */
export async function appendAuditEntry(
  tx: Pick<typeof prisma, "paymentAuditLogEntry">,
  paymentAgreementId: string,
  eventType: string,
  payload: unknown
): Promise<PaymentAuditLogEntry> {
  const last = await tx.paymentAuditLogEntry.findFirst({
    where: { paymentAgreementId },
    orderBy: { timestamp: "desc" },
  });
  const previousHash = last?.hash ?? GENESIS_HASH;
  const timestamp = new Date();
  const hash = computeHash(previousHash, eventType, payload, timestamp.toISOString());

  const row = await tx.paymentAuditLogEntry.create({
    data: { id: genId("audit"), paymentAgreementId, eventType, payload: payload as object, timestamp, previousHash, hash },
  });
  return toPaymentAuditLogEntry(row);
}

/** Recomputes every entry's hash from its stored previousHash/payload/timestamp and confirms the
 * chain hasn't been tampered with — the "Verify chain" affordance in the audit trail panel. */
export function verifyAuditChain(entries: PaymentAuditLogEntry[]): { valid: boolean; brokenAtId?: string } {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let expectedPrevious = GENESIS_HASH;
  for (const entry of sorted) {
    if (entry.previousHash !== expectedPrevious) return { valid: false, brokenAtId: entry.id };
    const recomputed = computeHash(entry.previousHash, entry.eventType, entry.payload, entry.timestamp);
    if (recomputed !== entry.hash) return { valid: false, brokenAtId: entry.id };
    expectedPrevious = entry.hash;
  }
  return { valid: true };
}
