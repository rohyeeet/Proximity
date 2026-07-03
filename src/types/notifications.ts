export type NotificationType = "form_published";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  formTemplateId?: string;
  createdAt: string;
  readAt?: string;
}
