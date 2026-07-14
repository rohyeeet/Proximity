import type { FlowNodeDefinition, FlowEdgeDefinition, FlowTemplate } from "@/types";

/**
 * DFS back-edge detection — flags edges that close a cycle in the graph, independent of
 * their declared `kind`. Used both to keep auto-layout from breaking on correction loops
 * and to validate that every cycle is intentionally marked as a correction edge.
 */
export function findBackEdges(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): Set<string> {
  const adjacency = new Map<string, FlowEdgeDefinition[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge);
    adjacency.set(edge.fromNodeId, list);
  }
  const color = new Map<string, 0 | 1 | 2>();
  for (const node of nodes) color.set(node.id, 0);
  const backEdgeIds = new Set<string>();

  function dfs(nodeId: string) {
    color.set(nodeId, 1);
    for (const edge of adjacency.get(nodeId) ?? []) {
      const targetColor = color.get(edge.toNodeId);
      if (targetColor === undefined) continue;
      if (targetColor === 1) backEdgeIds.add(edge.id);
      else if (targetColor === 0) dfs(edge.toNodeId);
    }
    color.set(nodeId, 2);
  }

  for (const node of nodes) {
    if (color.get(node.id) === 0) dfs(node.id);
  }
  return backEdgeIds;
}

function computeLayers(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): Map<string, number> {
  // Correction edges are rework loops, never forward progress — excluding them up front (rather
  // than relying on DFS back-edge detection alone) keeps a correction-loop node from being pushed
  // a column past the gate it returns to, which is what produced crossing, overlapping layouts.
  const topologyEdges = edges.filter((edge) => edge.kind !== "correction");
  const backEdges = findBackEdges(nodes, topologyEdges);
  const forwardEdges = topologyEdges.filter((edge) => !backEdges.has(edge.id));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) indegree.set(node.id, 0);
  for (const edge of forwardEdges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) ?? 0) + 1);
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
  }

  // A node touched by zero forward edges (in or out) isn't a "root" — it's isolated from this
  // topology entirely (e.g. a correction-loop target only reachable via excluded correction
  // edges). Seeding it at layer 0 here would beat the neighbor-inheritance fallback below to it.
  const topologyNodeIds = new Set<string>();
  for (const edge of forwardEdges) {
    topologyNodeIds.add(edge.fromNodeId);
    topologyNodeIds.add(edge.toNodeId);
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const node of nodes) {
    if (!topologyNodeIds.has(node.id)) continue;
    if ((indegree.get(node.id) ?? 0) === 0) {
      layer.set(node.id, 0);
      queue.push(node.id);
    }
  }

  const remainingIndegree = new Map(indegree);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layer.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, currentLayer + 1));
      const remaining = (remainingIndegree.get(next) ?? 0) - 1;
      remainingIndegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  // A node touched only by correction edges (e.g. a correction-loop target) has no forward
  // edges at all and would otherwise default to layer 0. Instead, sit it alongside whichever
  // neighbor it corrects — a vertical offshoot, not a step forward.
  for (const node of nodes) {
    if (layer.has(node.id)) continue;
    const correctionEdge = edges.find((edge) => edge.kind === "correction" && (edge.fromNodeId === node.id || edge.toNodeId === node.id));
    const neighborId = correctionEdge ? (correctionEdge.fromNodeId === node.id ? correctionEdge.toNodeId : correctionEdge.fromNodeId) : undefined;
    layer.set(node.id, (neighborId ? layer.get(neighborId) : undefined) ?? 0);
  }

  return layer;
}

/** Layered auto-layout: columns by topological depth (back edges excluded), rows spread within a column. */
export function autoArrangeFlow(
  nodes: FlowNodeDefinition[],
  edges: FlowEdgeDefinition[]
): { id: string; position: { x: number; y: number } }[] {
  const layers = computeLayers(nodes, edges);
  const nodesByLayer = new Map<number, string[]>();
  for (const node of nodes) {
    const layerIndex = layers.get(node.id) ?? 0;
    const list = nodesByLayer.get(layerIndex) ?? [];
    list.push(node.id);
    nodesByLayer.set(layerIndex, list);
  }

  const COLUMN_WIDTH = 360;
  const ROW_HEIGHT = 210;
  const positions: { id: string; position: { x: number; y: number } }[] = [];
  for (const [layerIndex, ids] of nodesByLayer.entries()) {
    const offset = ((ids.length - 1) * ROW_HEIGHT) / 2;
    ids.forEach((id, i) => {
      positions.push({ id, position: { x: layerIndex * COLUMN_WIDTH, y: i * ROW_HEIGHT - offset } });
    });
  }
  return positions;
}

export interface FlowIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  edgeId?: string;
}

/**
 * Real structural validation for the flow graph. `resolveForm`/`isStillInStage` are injected
 * (rather than reading the studio store directly) to keep this module a pure, React-free utility.
 */
export function validateFlow(
  flow: FlowTemplate,
  resolveForm: (formTemplateId: string) => boolean,
  isStillInStage: (stageId: string, formTemplateId: string) => boolean = () => true
): { errors: FlowIssue[]; warnings: FlowIssue[] } {
  const { nodes, edges } = flow;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const errors: FlowIssue[] = [];
  const warnings: FlowIssue[] = [];
  let seq = 0;
  const nextId = () => `issue-${seq++}`;

  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      errors.push({ id: nextId(), severity: "error", message: `An edge references a node that no longer exists.`, edgeId: edge.id });
    }
  }
  const validEdges = edges.filter((edge) => nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId));

  const hasIncoming = new Set(validEdges.map((edge) => edge.toNodeId));
  const hasOutgoing = new Set(validEdges.map((edge) => edge.fromNodeId));
  if (nodes.length > 1) {
    for (const node of nodes) {
      if (!hasIncoming.has(node.id) && !hasOutgoing.has(node.id)) {
        errors.push({ id: nextId(), severity: "error", message: `"${node.label}" isn't connected to anything.`, nodeId: node.id });
      }
    }
  }

  for (const node of nodes) {
    if (node.nodeType === "form_step" || node.nodeType === "automation" || node.nodeType === "document") {
      if (!node.formTemplateId) {
        warnings.push({ id: nextId(), severity: "warning", message: `"${node.label}" isn't linked to a form yet.`, nodeId: node.id });
      } else if (!resolveForm(node.formTemplateId)) {
        errors.push({ id: nextId(), severity: "error", message: `"${node.label}" links to a form that no longer exists.`, nodeId: node.id });
      } else if (node.sourceStageId && !isStillInStage(node.sourceStageId, node.formTemplateId)) {
        warnings.push({
          id: nextId(),
          severity: "warning",
          message: `"${node.label}" is out of sync with its stage — run "Sync from stages" to reconcile.`,
          nodeId: node.id,
        });
      }
    }
    if (node.nodeType === "payment_step" && !node.milestoneTemplateId) {
      warnings.push({ id: nextId(), severity: "warning", message: `"${node.label}" isn't wired to a milestone template yet.`, nodeId: node.id });
    }
  }

  const backEdgeIds = findBackEdges(nodes, validEdges);
  for (const edge of validEdges) {
    if (backEdgeIds.has(edge.id) && edge.kind !== "correction") {
      errors.push({ id: nextId(), severity: "error", message: `This edge creates a cycle but isn't marked as a correction loop.`, edgeId: edge.id });
    }
  }

  const forwardEdges = validEdges.filter((edge) => !backEdgeIds.has(edge.id));
  const adjacency = new Map<string, string[]>();
  for (const edge of forwardEdges) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
  }
  const forwardIncoming = new Set(forwardEdges.map((edge) => edge.toNodeId));
  const roots = nodes.filter((node) => !forwardIncoming.has(node.id)).map((node) => node.id);
  const reached = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  for (const node of nodes) {
    if (!reached.has(node.id) && (hasIncoming.has(node.id) || hasOutgoing.has(node.id))) {
      errors.push({ id: nextId(), severity: "error", message: `"${node.label}" is unreachable from the start of the flow.`, nodeId: node.id });
    }
  }

  const starts = nodes.filter((node) => node.nodeType === "start");
  if (nodes.length > 0 && starts.length === 0) {
    warnings.push({ id: nextId(), severity: "warning", message: "This flow has no start node marking where the process begins." });
  }
  for (const start of starts) {
    if (hasIncoming.has(start.id)) {
      warnings.push({
        id: nextId(),
        severity: "warning",
        message: `Start node "${start.label}" has incoming edges — start nodes should be roots.`,
        nodeId: start.id,
      });
    }
  }

  const milestones = nodes.filter((node) => node.nodeType === "milestone");
  if (nodes.length > 0 && milestones.length === 0) {
    warnings.push({ id: nextId(), severity: "warning", message: "This flow has no milestone node marking when the cycle is closeable." });
  }
  for (const milestone of milestones) {
    if (!reached.has(milestone.id)) {
      warnings.push({ id: nextId(), severity: "warning", message: `Milestone "${milestone.label}" isn't reachable yet.`, nodeId: milestone.id });
    }
    if (hasOutgoing.has(milestone.id)) {
      warnings.push({
        id: nextId(),
        severity: "warning",
        message: `Milestone "${milestone.label}" has outgoing edges — milestones should be terminal.`,
        nodeId: milestone.id,
      });
    }
  }

  for (const node of nodes) {
    if (node.nodeType === "branch") {
      const outgoing = validEdges.filter((edge) => edge.fromNodeId === node.id);
      if (outgoing.length < 2) {
        warnings.push({ id: nextId(), severity: "warning", message: `Branch "${node.label}" has fewer than 2 outgoing paths.`, nodeId: node.id });
      }
      for (const edge of outgoing) {
        if (!edge.conditionLabel && !edge.condition) {
          warnings.push({
            id: nextId(),
            severity: "warning",
            message: `An edge out of branch "${node.label}" has no condition set.`,
            edgeId: edge.id,
          });
        }
      }
    }
  }

  return { errors, warnings };
}
