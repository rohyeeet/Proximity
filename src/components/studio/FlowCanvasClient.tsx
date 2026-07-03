"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowNode, type FlowNodeData } from "./FlowNode";
import { FlowNodePalette } from "./FlowNodePalette";
import { FlowNodeInspector } from "./FlowNodeInspector";
import { FlowEdgeInspector } from "./FlowEdgeInspector";
import { FlowValidationPanel } from "./FlowValidationPanel";
import { flowNodeCatalog } from "./flow-node-catalog";
import { KnowledgeProvider, useKnowledge } from "./knowledge/KnowledgeContext";
import { KnowledgeDrawer } from "./knowledge/KnowledgeDrawer";
import { InfoHint } from "./knowledge/InfoHint";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditableText } from "@/components/ui/EditableText";
import { useStudio } from "@/lib/studio";
import { useSession } from "@/lib/session";
import { canEditStudio } from "@/lib/permissions";
import { BookOpen, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { autoArrangeFlow, validateFlow, type FlowIssue } from "@/lib/graph-utils";
import { syncFlowWithStages } from "@/lib/flow-sync";
import { cn, genId } from "@/lib/utils";
import type { FlowNodeDefinition, FlowNodeType, FlowTemplate } from "@/types";

const nodeTypes = { flowNode: FlowNode };

const edgeColorByKind: Record<string, string> = {
  sequential: "#8a8d83",
  parallel: "#2a4cdb",
  conditional: "#b4791a",
  correction: "#b23a2e",
};

type Selection = { type: "node" | "edge"; id: string } | null;

function toRfNodes(flow: FlowTemplate, selection: Selection): Node<FlowNodeData>[] {
  return flow.nodes.map((node) => ({
    id: node.id,
    type: "flowNode",
    position: node.position,
    selected: selection?.type === "node" && selection.id === node.id,
    data: {
      label: node.label,
      nodeType: node.nodeType,
      detail: node.detail,
      unlinked:
        (node.nodeType === "form_step" || node.nodeType === "automation" || node.nodeType === "document") && !node.formTemplateId,
      fromStage: Boolean(node.sourceStageId),
    },
  }));
}

function toRfEdges(flow: FlowTemplate, selection: Selection): Edge[] {
  return flow.edges.map((edge) => {
    const color = edgeColorByKind[edge.kind] ?? edgeColorByKind.sequential!;
    const isSelected = selection?.type === "edge" && selection.id === edge.id;
    return {
      id: edge.id,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      label: edge.conditionLabel,
      animated: edge.kind === "correction",
      selected: isSelected,
      style: { stroke: color, strokeWidth: isSelected ? 3 : 1.5, strokeDasharray: edge.kind === "correction" ? "5 3" : undefined },
      labelStyle: { fontSize: 11, fill: color, fontWeight: 600 },
      labelBgStyle: { fill: "#fbfbf9" },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    };
  });
}

export function FlowCanvasClient({ flowId }: { flowId: string }) {
  return (
    <KnowledgeProvider scope="flow">
      <ReactFlowProvider>
        <FlowCanvasInner flowId={flowId} />
      </ReactFlowProvider>
    </KnowledgeProvider>
  );
}

function FlowCanvasInner({ flowId }: { flowId: string }) {
  const { getFlow, getForm, getStage, stages, updateFlow, publishFlow, isFlowDirty } = useStudio();
  const { openList } = useKnowledge();
  const { session } = useSession();
  const canEdit = canEditStudio(session.role.tier);
  const flow = getFlow(flowId);
  const reactFlow = useReactFlow();

  const [selection, setSelection] = useState<Selection>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node<FlowNodeData>>(flow ? toRfNodes(flow, null) : []);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<Edge>(flow ? toRfEdges(flow, null) : []);
  const [validation, setValidation] = useState<{ errors: FlowIssue[]; warnings: FlowIssue[] } | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string[] | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  function refitView() {
    window.setTimeout(() => reactFlow.fitView({ padding: 0.15, duration: 300 }), 50);
  }

  useEffect(() => {
    if (!flow) return;
    setNodes(toRfNodes(flow, selection));
    setEdges(toRfEdges(flow, selection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, selection]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen) refitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  if (!flow) {
    return <EmptyState title="This flow no longer exists." />;
  }

  function deleteNode(nodeId: string) {
    updateFlow(flow!.id, (prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
    setSelection((s) => (s?.type === "node" && s.id === nodeId ? null : s));
  }

  function deleteEdge(edgeId: string) {
    updateFlow(flow!.id, (prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }));
    setSelection((s) => (s?.type === "edge" && s.id === edgeId ? null : s));
  }

  function handleNodesChange(changes: Parameters<typeof onNodesChangeInternal>[0]) {
    onNodesChangeInternal(changes);
    for (const change of changes) {
      if (change.type === "position" && change.position && change.dragging === false) {
        const { id, position } = change;
        updateFlow(flow!.id, (prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === id ? { ...n, position } : n)) }));
      }
      if (change.type === "remove") deleteNode(change.id);
    }
  }

  function handleEdgesChange(changes: Parameters<typeof onEdgesChangeInternal>[0]) {
    onEdgesChangeInternal(changes);
    for (const change of changes) {
      if (change.type === "remove") deleteEdge(change.id);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const id = genId("edge");
    updateFlow(flow!.id, (prev) => ({
      ...prev,
      edges: [...prev.edges, { id, fromNodeId: connection.source!, toNodeId: connection.target!, kind: "sequential" }],
    }));
    setSelection({ type: "edge", id });
  }

  function handleReconnect(oldEdge: Edge, newConnection: Connection) {
    if (!newConnection.source || !newConnection.target) return;
    updateFlow(flow!.id, (prev) => ({
      ...prev,
      edges: prev.edges.map((e) =>
        e.id === oldEdge.id ? { ...e, fromNodeId: newConnection.source!, toNodeId: newConnection.target!, auto: false } : e
      ),
    }));
  }

  function handleAddNode(nodeType: FlowNodeType) {
    const id = genId("node");
    const selectedNode = selection?.type === "node" ? flow!.nodes.find((n) => n.id === selection.id) : undefined;
    const newNode: FlowNodeDefinition = {
      id,
      nodeType,
      label: flowNodeCatalog.find((m) => m.type === nodeType)!.label,
      position: selectedNode ? { x: selectedNode.position.x + 300, y: selectedNode.position.y } : { x: 0, y: flow!.nodes.length * 40 },
    };
    updateFlow(flow!.id, (prev) => {
      const nextNodes = [...prev.nodes, newNode];
      const nextEdges = selectedNode ? [...prev.edges, { id: genId("edge"), fromNodeId: selectedNode.id, toNodeId: id, kind: "sequential" as const }] : prev.edges;
      const arranged = autoArrangeFlow(nextNodes, nextEdges);
      const arrangedNodes = nextNodes.map((n) => ({ ...n, position: arranged.find((a) => a.id === n.id)?.position ?? n.position }));
      return { ...prev, nodes: arrangedNodes, edges: nextEdges };
    });
    setSelection({ type: "node", id });
    refitView();
  }

  function handleAutoArrange() {
    updateFlow(flow!.id, (prev) => {
      const arranged = autoArrangeFlow(prev.nodes, prev.edges);
      return { ...prev, nodes: prev.nodes.map((n) => ({ ...n, position: arranged.find((a) => a.id === n.id)?.position ?? n.position })) };
    });
    refitView();
  }

  function runValidate() {
    const result = validateFlow(
      flow!,
      (formId) => Boolean(getForm(formId)),
      (stageId, formId) => getStage(stageId)?.formTemplateIds.includes(formId) ?? false
    );
    setValidation(result);
    setShowValidation(true);
    setSyncSummary(null);
    return result;
  }

  function handlePublish() {
    const result = runValidate();
    if (result.errors.length > 0) return;
    publishFlow(flow!.id);
  }

  function handleSync() {
    const { flow: synced, summary } = syncFlowWithStages(flow!, stages, (formId) => getForm(formId)?.name);
    updateFlow(flow!.id, () => synced);
    setSyncSummary(summary);
    setShowValidation(false);
    refitView();
  }

  function handleSelectIssue(issue: FlowIssue) {
    if (issue.nodeId) {
      setSelection({ type: "node", id: issue.nodeId });
      const node = flow!.nodes.find((n) => n.id === issue.nodeId);
      if (node) reactFlow.setCenter(node.position.x + 110, node.position.y + 50, { zoom: 0.9, duration: 400 });
    } else if (issue.edgeId) {
      setSelection({ type: "edge", id: issue.edgeId });
    }
  }

  const selectedNode = selection?.type === "node" ? flow.nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge = selection?.type === "edge" ? flow.edges.find((e) => e.id === selection.id) : undefined;
  const dirty = isFlowDirty(flow.id);

  return (
    <div className={cn(fullscreen && "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper p-4")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <EditableText
            value={flow.name}
            onChange={(name) => updateFlow(flow.id, (prev) => ({ ...prev, name }))}
            canEdit={canEdit}
            as="h1"
            wrapperClassName="flex w-full items-center gap-1.5"
            textClassName="text-xl font-semibold text-ink"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
            <span>Triggers on</span>
            <EditableText
              value={flow.triggerLabel}
              onChange={(triggerLabel) => updateFlow(flow.id, (prev) => ({ ...prev, triggerLabel }))}
              canEdit={canEdit}
              textClassName="text-sm text-ink-soft"
            />
            <StatusChip label={flow.status === "published" ? "Live" : "Draft"} tone={flow.status === "published" ? "good" : "hold"} />
            {!canEdit && <StatusChip label="View only" tone="hold" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={openList}>
            <BookOpen className="size-3.5" /> Guide
          </Button>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={handleSync}>
              <RefreshCw className="size-3.5" /> Sync from stages
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={handleAutoArrange}>
              Auto-arrange
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={runValidate}>
            Validate graph
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={handlePublish}>
              {dirty ? `Publish v${flow.versionNo + 1}` : `v${flow.versionNo} published`}
            </Button>
          )}
        </div>
      </div>

      <KnowledgeDrawer />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        {flowNodeCatalog.map((item) => (
          <span key={item.type} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <span className={`size-2.5 rounded-sm border ${item.className}`} />
            {item.label}
          </span>
        ))}
      </div>

      {syncSummary && (
        <div className="mb-3 rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              Synced from stages
              <InfoHint topicId="flow-sync" />
            </p>
            <button onClick={() => setSyncSummary(null)} className="text-[12px] text-ink-soft hover:text-ink">
              Dismiss
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {syncSummary.map((line, i) => (
              <li
                key={i}
                className={cn(
                  "text-[13px]",
                  line.startsWith("+") ? "text-good-text" : line.startsWith("−") ? "text-critical-text" : line.startsWith("✓") ? "text-brand-600" : "text-ink-soft"
                )}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showValidation && validation && (
        <div className="mb-3 rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              Validation results
              <InfoHint topicId="flow-validate" />
            </p>
            <button onClick={() => setShowValidation(false)} className="text-[12px] text-ink-soft hover:text-ink">
              Dismiss
            </button>
          </div>
          <FlowValidationPanel errors={validation.errors} warnings={validation.warnings} onSelectIssue={handleSelectIssue} />
        </div>
      )}

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: canEdit
            ? `${paletteCollapsed ? "48px" : fullscreen ? "240px" : "220px"} 1fr ${fullscreen ? "340px" : "300px"}`
            : `1fr ${fullscreen ? "340px" : "300px"}`,
        }}
      >
        {canEdit && (
          <FlowNodePalette
            onAddNode={handleAddNode}
            hasSelection={selection?.type === "node"}
            collapsed={paletteCollapsed}
            onToggleCollapsed={() => setPaletteCollapsed((c) => !c)}
          />
        )}

        <div className={cn("rounded-lg border border-border bg-sunken/30", fullscreen ? "h-[calc(100vh-180px)]" : "h-[70vh] min-h-[420px]")}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onReconnect={handleReconnect}
            onNodeClick={(_, node) => setSelection({ type: "node", id: node.id })}
            onEdgeClick={(_, edge) => setSelection({ type: "edge", id: edge.id })}
            onPaneClick={() => setSelection(null)}
            deleteKeyCode={canEdit ? ["Backspace", "Delete"] : []}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
          >
            <Background gap={20} color="#d9dcd2" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-surface" />
          </ReactFlow>
        </div>

        <div className={cn("overflow-y-auto rounded-lg border border-border bg-surface p-4", fullscreen && "h-[calc(100vh-180px)]")}>
          <fieldset disabled={!canEdit} className="contents border-0 p-0 m-0">
            {selectedNode && (
              <FlowNodeInspector
                node={selectedNode}
                domainPackId={flow.domainPackId}
                onChange={(patch) => updateFlow(flow.id, (prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n)) }))}
                onDelete={() => deleteNode(selectedNode.id)}
                onAddSuggested={canEdit ? handleAddNode : undefined}
              />
            )}
            {selectedEdge && (
              <FlowEdgeInspector
                flow={flow}
                edge={selectedEdge}
                onChange={(patch) =>
                  updateFlow(flow.id, (prev) => ({
                    ...prev,
                    edges: prev.edges.map((e) => (e.id === selectedEdge.id ? { ...e, ...patch, auto: false } : e)),
                  }))
                }
                onDelete={() => deleteEdge(selectedEdge.id)}
              />
            )}
          </fieldset>
          {!selectedNode && !selectedEdge && <p className="text-sm text-ink-soft">Select a node or edge to edit its properties.</p>}
        </div>
      </div>
    </div>
  );
}
