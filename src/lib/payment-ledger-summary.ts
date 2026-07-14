import type { PaymentAgreementDetail } from "@/lib/queries";
import type { ParticipantRole } from "@/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface RoleShareSummary {
  participantRole: ParticipantRole;
  /** This role's % on each milestone that pays them — never another role's %. */
  percentByMilestone: { milestoneId: string; label: string; percent: number }[];
  allocated: number;
  disbursed: number;
  pending: number;
}

/** One role's own cut across an agreement — never another participant's split or identity. Reads
 * each milestone's own (template-snapshotted) split, falling back to the agreement-wide split for
 * pre-template agreements that never set a per-milestone one. */
export function computeRoleShare(detail: PaymentAgreementDetail, role: ParticipantRole): RoleShareSummary {
  let allocated = 0;
  let disbursed = 0;
  const percentByMilestone: RoleShareSummary["percentByMilestone"] = [];
  for (const milestone of detail.milestones) {
    const rules = milestone.splitRules.length > 0 ? milestone.splitRules : detail.splitRules;
    const rule = rules.find((r) => r.participantRole === role);
    if (!rule) continue;
    const milestoneValue = detail.agreement.totalValue * (milestone.percentOfTotal / 100);
    allocated += milestoneValue * (rule.percent / 100);
    percentByMilestone.push({ milestoneId: milestone.id, label: milestone.label, percent: rule.percent });
    for (const payout of milestone.payoutInstructions) {
      if (payout.participantRole === role && payout.status === "paid") disbursed += payout.amount;
    }
  }
  allocated = round2(allocated);
  disbursed = round2(disbursed);
  return { participantRole: role, percentByMilestone, allocated, disbursed, pending: Math.max(0, round2(allocated - disbursed)) };
}

/** Total released to date across every role — the investor-facing "how much has actually left
 * escrow" figure, without breaking it down by who received what. */
export function computeAgreementDisbursedTotal(detail: PaymentAgreementDetail): number {
  const total = detail.milestones.reduce(
    (sum, milestone) => sum + milestone.payoutInstructions.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    0
  );
  return round2(total);
}
