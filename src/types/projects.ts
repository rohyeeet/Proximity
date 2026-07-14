/** A real-world site/deal an organization runs — e.g. one specific biochar facility and its
 * offtake deal. An organization can run several projects; each gets its own Flow and its own
 * Payments (milestone templates, agreements, escrow), while Stages/FormTemplates stay shared
 * domain-pack-level config every project on that domain pack draws from. */
export interface Project {
  id: string;
  organizationId: string;
  domainPackId: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  createdAt: string;
}
