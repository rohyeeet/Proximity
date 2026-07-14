import type { FlowEdgeCondition, FlowTemplate, SubmissionAnswer } from "@/types";

/** One generic rule evaluator for every conditional edge — checks a real submitted answer against
 * the edge's rule, never a hand-coded per-flow special case. */
export function evaluateCondition(condition: FlowEdgeCondition, answers: SubmissionAnswer[]): boolean {
  const answer = answers.find((a) => a.fieldCode === condition.fieldCode);
  if (!answer || answer.value === null) return false;
  const raw = String(answer.value);
  switch (condition.operator) {
    case "equals":
      return raw === condition.value;
    case "not_equals":
      return raw !== condition.value;
    case "greater_than":
      return Number(raw) > Number(condition.value);
    case "less_than":
      return Number(raw) < Number(condition.value);
  }
}

/** Walks backward through non-correction edges to find the nearest upstream node with a linked
 * form — shared by the edge inspector (to know which form's fields a rule can check) and by
 * assigned-work resolution (to know which submissions actually decide the rule). */
export function findUpstreamFormTemplateId(flow: FlowTemplate, fromNodeId: string): string | null {
  const visited = new Set<string>();
  let frontier = [fromNodeId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (node?.formTemplateId) return node.formTemplateId;
      const incoming = flow.edges.filter((edge) => edge.toNodeId === nodeId && edge.kind !== "correction");
      next.push(...incoming.map((edge) => edge.fromNodeId));
    }
    frontier = next;
  }
  return null;
}
