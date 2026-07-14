/**
 * "Proximity Pay" — a deliberately fake PSP. No real money ever moves; every function here is a
 * simulation the rest of the Payments module treats as if it were a real payment processor's API,
 * so the claim → consent → gate → payout lifecycle can be demoed end to end. See
 * CARBON_MARKETS_PAYMENTS_INFRA_DESIGN.md §12 (split engine), §13 (KYC/BAV gate), §15 (routing),
 * §17 (settlement confirmation).
 */
import { genId } from "@/lib/utils";
import type { EscrowAccount, EscrowStatus, ParticipantRole, PayoutInstructionStatus, PayoutRecipient, SplitRule } from "@/types";

/** Fake illustrative core-portion rate — not derived from any real product decision. */
const ANNUAL_INTEREST_RATE = 0.065;
const MS_PER_DAY = 86_400_000;

/** Interest is computed fresh from the escrow's held balance and funding date every time it's
 * read — never stored/mutated by a cron — matching §11's core-portion accrual model. */
export function computeAccruedInterest(escrow: Pick<EscrowAccount, "corePortionBalance" | "fundedAt" | "status">): number {
  if (escrow.status === "fully_released") return 0;
  const daysHeld = Math.max(0, (Date.now() - new Date(escrow.fundedAt).getTime()) / MS_PER_DAY);
  const interest = escrow.corePortionBalance * (ANNUAL_INTEREST_RATE / 365) * daysHeld;
  return Math.round(interest * 100) / 100;
}

/** One generic revenue-split engine (§12) for every milestone payout — never one hand-coded
 * splitter per revenue type. Any rounding remainder from percent-based division is folded into
 * the largest share so the parts always sum exactly to the whole. */
export function calculateSplit(amount: number, splitRules: SplitRule[]): { participantRole: ParticipantRole; amount: number }[] {
  if (splitRules.length === 0) return [];
  const shares = splitRules.map((rule) => ({
    participantRole: rule.participantRole,
    amount: Math.round(amount * (rule.percent / 100) * 100) / 100,
  }));
  const allocated = shares.reduce((sum, share) => sum + share.amount, 0);
  const remainder = Math.round((amount - allocated) * 100) / 100;
  if (remainder !== 0) {
    const largest = shares.reduce((a, b) => (b.amount > a.amount ? b : a));
    largest.amount = Math.round((largest.amount + remainder) * 100) / 100;
  }
  return shares;
}

/** The dual gate (§13): a gate check is just a status read, never a re-verification call.
 * `platform`/`investor` participant roles have no KYC/BAV recipient at all in this model (only
 * `developer`/`farmer_community` payouts go through the dual gate) and clear as soon as the
 * milestone itself is verified. */
export function runGateCheck(milestoneVerified: boolean, recipient?: Pick<PayoutRecipient, "kycStatus" | "bavStatus">): PayoutInstructionStatus {
  if (!milestoneVerified) return "blocked_awaiting_verification";
  if (!recipient) return "ready";
  if (recipient.kycStatus !== "approved") return "blocked_awaiting_kyc";
  if (recipient.bavStatus !== "approved") return "blocked_awaiting_bav";
  return "ready";
}

export interface RouteResult {
  provider: string;
  reference: string;
}

export interface PaymentQuote {
  provider: string;
  /** Always 0 here — no real PSP fee schedule is modeled. A real provider would return its actual cut. */
  feeAmount: number;
  estimatedSettlementSeconds: number;
}

export interface SettlementConfirmation {
  reference: string;
  settledAt: Date;
}

/**
 * The seam a real PSP (Stripe, Razorpay, a banking-rail partner, ...) would implement in place of
 * `SimulatedPSP` — every escrow/disbursement flow in this app goes through this interface, not a
 * bespoke call per participant role, so swapping in a real provider later is a one-class change.
 * §15 (routing), §17 (settlement confirmation).
 */
export interface PaymentServiceProvider {
  /** What it would cost/how long it would take to pay this role — checked before routing. */
  quote(participantRole: ParticipantRole, amount: number, currency: string): PaymentQuote;
  /** Picks a corridor/provider + reference for this payout. */
  route(participantRole: ParticipantRole): RouteResult;
  /** Confirms a routed payout actually settled — the moment §17 calls "paid", not "initiated". */
  settle(route: RouteResult): SettlementConfirmation;
}

const CORRIDORS: Record<ParticipantRole, string[]> = {
  platform: ["Proximity Pay · Internal Ledger"],
  investor: ["Proximity Pay · Internal Ledger"],
  developer: ["Proximity Pay · SWIFT Wire", "Proximity Pay · Local Bank Transfer"],
  farmer_community: ["Proximity Pay · UPI", "Proximity Pay · Mobile Money"],
};

/** No real money ever moves: quote is free/instant, routing picks a plausible fake corridor +
 * reference (stands in for §15's weighted PSP-routing engine, simplified to one simulated provider
 * rather than a real multi-candidate scoring model), and settlement confirms immediately. */
class SimulatedPaymentServiceProvider implements PaymentServiceProvider {
  quote(): PaymentQuote {
    return { provider: "Proximity Pay", feeAmount: 0, estimatedSettlementSeconds: 0 };
  }

  route(participantRole: ParticipantRole): RouteResult {
    const options = CORRIDORS[participantRole];
    const provider = options[Math.floor(Math.random() * options.length)] ?? "Proximity Pay";
    const referenceSuffix = genId("ref").split("-")[1] ?? Date.now().toString(36);
    return { provider, reference: `PXP-${referenceSuffix.toUpperCase()}` };
  }

  settle(route: RouteResult): SettlementConfirmation {
    return { reference: route.reference, settledAt: new Date() };
  }
}

/** The one PSP instance the rest of Payments talks to — swap this for a real provider's
 * implementation of {@link PaymentServiceProvider} without touching any call site. */
export const proximityPayPSP: PaymentServiceProvider = new SimulatedPaymentServiceProvider();

export function newEscrowAccount(paymentAgreementId: string, heldAmount: number, currency: string) {
  return {
    id: genId("escrow"),
    paymentAgreementId,
    heldAmount,
    currency,
    corePortionBalance: heldAmount,
    interestAccruedToDate: 0,
    status: "holding" satisfies EscrowStatus,
    fundedAt: new Date(),
  };
}
