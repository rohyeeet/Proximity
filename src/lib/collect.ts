import type { FlowTemplate, FormTemplate, RoleTier, Stage } from "@/types";

export interface AssignedWorkItem {
  form: FormTemplate;
  stage?: Stage;
  flowNodeLabel: string;
  projectId: string;
  projectName: string;
}

/**
 * "What am I assigned to collect" — reads the flow's `assignedRoleTier` per node (already present
 * in the data model, previously write-only/decorative — see FlowNodeInspector's "Assigned role
 * tier" field) and resolves it against the current viewer's own tier. Deliberately keyed by
 * whatever tier is passed in, not hardcoded to "submitter", so the same helper also correctly
 * scopes a reviewer's own assigned nodes (e.g. a Lab Technician's Lab COA duty) if they ever open
 * the Collect app themselves.
 *
 * Called once per project the org runs (a submitter can be assigned work across more than one) —
 * results are tagged with that project's id/name so the same form assigned in two projects shows
 * up twice, once per project context, since a submission must be attributed to exactly one.
 */
export function getAssignedWork(
  flow: FlowTemplate | undefined,
  forms: FormTemplate[],
  stages: Stage[],
  tier: RoleTier,
  projectId: string,
  projectName: string
): AssignedWorkItem[] {
  if (!flow) return [];
  const formsById = new Map(forms.map((f) => [f.id, f]));
  const items: AssignedWorkItem[] = [];
  const seenFormIds = new Set<string>();

  for (const node of flow.nodes) {
    if (node.assignedRoleTier !== tier || !node.formTemplateId) continue;
    const form = formsById.get(node.formTemplateId);
    if (!form || seenFormIds.has(form.id)) continue;
    seenFormIds.add(form.id);
    const stage = stages.find((s) => s.formTemplateIds.includes(form.id));
    items.push({ form, stage, flowNodeLabel: node.label, projectId, projectName });
  }

  return items;
}
