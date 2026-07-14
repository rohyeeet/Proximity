import type { MilestoneType, ParticipantRole, VerificationSource } from "@/types";

/** Shared human-readable labels for Payments enums — used by the milestone template editor, the
 * agreement builder, and the agreement detail view, so all three read identically. */
export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  setup_capex: "Setup / CAPEX",
  achievement: "Achievement",
  monitoring_cycle: "Monitoring cycle",
};

export const VERIFICATION_SOURCE_LABELS: Record<VerificationSource, string> = {
  site_inspection: "Site inspection",
  gis_satellite: "GIS / satellite",
  ops_data_review: "Ops data review",
  registry_api: "Registry API",
  vvb_attestation_upload: "VVB attestation upload",
  registry_portal_confirmation: "Registry portal confirmation",
};

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  platform: "Platform",
  developer: "Developer",
  farmer_community: "Farmer / community",
  investor: "Investor",
};

/** One consistent hue per participant role (see globals.css's categorical role palette) — used for
 * every split/ledger chip so a role reads the same color everywhere it appears, across Payments. */
export const PARTICIPANT_ROLE_CHIP_CLASSES: Record<ParticipantRole, string> = {
  platform: "bg-role-platform-bg text-role-platform",
  developer: "bg-role-developer-bg text-role-developer",
  farmer_community: "bg-role-farmer-bg text-role-farmer",
  investor: "bg-role-investor-bg text-role-investor",
};

export const PARTICIPANT_ROLE_DOT_CLASSES: Record<ParticipantRole, string> = {
  platform: "bg-role-platform",
  developer: "bg-role-developer",
  farmer_community: "bg-role-farmer",
  investor: "bg-role-investor",
};

export const DEFAULT_SPLIT_DRAFT: { participantRole: ParticipantRole; percent: string }[] = [
  { participantRole: "platform", percent: "8" },
  { participantRole: "developer", percent: "60" },
  { participantRole: "farmer_community", percent: "27" },
  { participantRole: "investor", percent: "5" },
];
