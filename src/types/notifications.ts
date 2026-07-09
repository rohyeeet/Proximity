export type NotificationType =
  | "form_published"
  | "claim_needs_consent"
  | "payout_blocked_on_bav"
  | "payout_blocked_on_kyc"
  | "milestone_confirmed_by_registry"
  | "payout_paid";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  formTemplateId?: string;
  /** Generic destination for notification types added after formTemplateId. */
  linkUrl?: string;
  createdAt: string;
  readAt?: string;
}
