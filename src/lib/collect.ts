import { evaluateCondition, findUpstreamFormTemplateId } from "@/lib/flow-conditions";
import type { FlowTemplate, FormTemplate, RoleTier, Stage, Submission } from "@/types";

export interface AssignedWorkItem {
  form: FormTemplate;
  stage?: Stage;
  flowNodeLabel: string;
  projectId: string;
  projectName: string;
}

/** True if a node has no gating rule at all, or has one that the viewer's own submissions on the
 * relevant upstream form actually satisfy — the real execution behind a conditional edge's
 * "Rule (BRE)" (see FlowEdgeInspector.tsx), not just documentation of intent. A node reached only
 * by plain sequential/parallel edges is never gated; one reached via a conditional edge with a
 * real `condition` set is only assigned once the viewer's own data actually triggers it. */
function isConditionSatisfied(flow: FlowTemplate, nodeId: string, projectId: string, submissions: Submission[]): boolean {
  const gatingEdges = flow.edges.filter((e) => e.toNodeId === nodeId && e.kind === "conditional" && e.condition);
  if (gatingEdges.length === 0) return true;

  return gatingEdges.some((edge) => {
    const upstreamFormId = findUpstreamFormTemplateId(flow, edge.fromNodeId);
    if (!upstreamFormId) return false;
    return submissions.some(
      (s) => s.projectId === projectId && s.formTemplateId === upstreamFormId && evaluateCondition(edge.condition!, s.answers)
    );
  });
}

/**
 * "What am I assigned to collect" — reads the flow's `assignedRoleTier` per node (already present
 * in the data model, previously write-only/decorative — see FlowNodeInspector's "Assigned role
 * tier" field) and resolves it against the current viewer's own tier. Deliberately keyed by
 * whatever tier is passed in, not hardcoded to "submitter", so the same helper also correctly
 * scopes a reviewer's own assigned nodes (e.g. a Lab Technician's Lab COA duty) if they ever open
 * the Collect app themselves.
 *
 * `submissions` is the viewer's own submission history (across every project) — used only to gate
 * nodes reached via a real conditional-edge rule; a node with no such rule is assigned exactly as
 * before, so this is additive, not a behavior change for the vast majority of flows.
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
  projectName: string,
  submissions: Submission[]
): AssignedWorkItem[] {
  if (!flow) return [];
  const formsById = new Map(forms.map((f) => [f.id, f]));
  const items: AssignedWorkItem[] = [];
  const seenFormIds = new Set<string>();

  for (const node of flow.nodes) {
    if (node.assignedRoleTier !== tier || !node.formTemplateId) continue;
    const form = formsById.get(node.formTemplateId);
    if (!form || seenFormIds.has(form.id)) continue;
    if (!isConditionSatisfied(flow, node.id, projectId, submissions)) continue;
    seenFormIds.add(form.id);
    const stage = stages.find((s) => s.formTemplateIds.includes(form.id));
    items.push({ form, stage, flowNodeLabel: node.label, projectId, projectName });
  }

  return items;
}
