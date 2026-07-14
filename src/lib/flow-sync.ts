import { autoArrangeFlow } from "./graph-utils";
import { genId } from "./utils";
import type { FlowNodeDefinition, FlowTemplate, Stage } from "@/types";

interface BackbonePair {
  stageId: string;
  formId: string;
  stageName: string;
}

function isReachable(edges: FlowTemplate["edges"], fromNodeId: string, toNodeId: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
  }
  const visited = new Set<string>([fromNodeId]);
  const queue = [fromNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (next === toNodeId) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

function canonicalBackbone(stages: Stage[], domainPackId: string): BackbonePair[] {
  return stages
    .filter((stage) => stage.domainPackId === domainPackId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((stage) => stage.formTemplateIds.map((formId) => ({ stageId: stage.id, formId, stageName: stage.name })));
}

/**
 * Regenerates the flow's stage-owned "backbone" (one form_step node per stage/form pair, connected
 * in stage order) while leaving every manually-authored node/edge untouched. A backbone edge stops
 * being regenerated the moment a user edits it (see `auto` clearing in FlowCanvasClient/FlowEdgeInspector),
 * so branches/gates layered on top of the skeleton survive repeated syncs.
 */
export function syncFlowWithStages(
  flow: FlowTemplate,
  stages: Stage[],
  domainPackId: string,
  getFormName: (formId: string) => string | undefined
): { flow: FlowTemplate; summary: string[] } {
  const summary: string[] = [];
  const canonical = canonicalBackbone(stages, domainPackId);
  const canonicalKeys = new Set(canonical.map((pair) => `${pair.stageId}::${pair.formId}`));

  const existingByKey = new Map<string, FlowNodeDefinition>();
  for (const node of flow.nodes) {
    if (node.sourceStageId && node.formTemplateId) {
      existingByKey.set(`${node.sourceStageId}::${node.formTemplateId}`, node);
    }
  }

  // Nodes not yet tagged with a stage — candidates to adopt into the backbone rather than duplicate.
  // Covers flows authored before Stages existed (a hand-built node already links to the right form).
  const claimableByFormId = new Map<string, FlowNodeDefinition[]>();
  for (const node of flow.nodes) {
    if (!node.sourceStageId && node.formTemplateId) {
      const list = claimableByFormId.get(node.formTemplateId) ?? [];
      list.push(node);
      claimableByFormId.set(node.formTemplateId, list);
    }
  }
  const adoptedNodeIds = new Set<string>();

  const staleNodes = flow.nodes.filter(
    (node) => node.sourceStageId && node.formTemplateId && !canonicalKeys.has(`${node.sourceStageId}::${node.formTemplateId}`)
  );
  const staleNodeIds = new Set(staleNodes.map((node) => node.id));
  for (const node of staleNodes) {
    summary.push(`− Removed "${node.label}" step (no longer in its stage)`);
  }

  let nodes = flow.nodes.filter((node) => !staleNodeIds.has(node.id));
  let edges = flow.edges.filter((edge) => !(edge.auto && (staleNodeIds.has(edge.fromNodeId) || staleNodeIds.has(edge.toNodeId))));

  const orderedBackboneNodeIds: string[] = [];
  for (const pair of canonical) {
    const key = `${pair.stageId}::${pair.formId}`;
    let node = existingByKey.get(key);
    if (!node) {
      const adoptable = (claimableByFormId.get(pair.formId) ?? []).find((candidate) => !adoptedNodeIds.has(candidate.id));
      if (adoptable) {
        adoptedNodeIds.add(adoptable.id);
        node = { ...adoptable, sourceStageId: pair.stageId };
        nodes = nodes.map((n) => (n.id === adoptable.id ? node! : n));
        summary.push(`✓ Linked existing "${adoptable.label}" step to its stage`);
      }
    }
    if (!node) {
      const formName = getFormName(pair.formId) ?? "Untitled form";
      node = {
        id: genId("node"),
        nodeType: "form_step",
        label: formName,
        assignedRoleTier: "submitter",
        formTemplateId: pair.formId,
        sourceStageId: pair.stageId,
        position: { x: 0, y: 0 },
      };
      nodes = [...nodes, node];
      summary.push(`+ Added "${formName}" step (${pair.stageName})`);
    }
    orderedBackboneNodeIds.push(node.id);
  }

  // Untouched auto edges get rebuilt fresh; edges a user has customized already lost `auto` and are left alone.
  edges = edges.filter((edge) => !edge.auto);
  for (let i = 0; i < orderedBackboneNodeIds.length - 1; i++) {
    const fromNodeId = orderedBackboneNodeIds[i]!;
    const toNodeId = orderedBackboneNodeIds[i + 1]!;
    // Skip if the next step is already reachable at all — e.g. through a hand-built review gate
    // sitting between them. A direct auto edge would bypass that gate rather than respect it.
    if (!isReachable(edges, fromNodeId, toNodeId)) {
      edges = [...edges, { id: genId("edge"), fromNodeId, toNodeId, kind: "sequential", auto: true }];
    }
  }

  const arranged = autoArrangeFlow(nodes, edges);
  nodes = nodes.map((node) => ({ ...node, position: arranged.find((a) => a.id === node.id)?.position ?? node.position }));

  if (summary.length === 0) summary.push("Already in sync — no changes.");

  return { flow: { ...flow, nodes, edges }, summary };
}
