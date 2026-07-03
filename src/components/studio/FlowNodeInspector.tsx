"use client";

import { Trash2 } from "lucide-react";
import { EntityPicker } from "./EntityPicker";
import { InfoHint } from "./knowledge/InfoHint";
import { flowNodeMetaByType, suggestedNextTypes } from "./flow-node-catalog";
import { useStudio } from "@/lib/studio";
import type { FlowNodeDefinition, FlowNodeType } from "@/types";

const roleTierOptions = ["submitter", "reviewer", "org_admin", "org_sub_admin", "designer", "viewer"];

export function FlowNodeInspector({
  node,
  domainPackId,
  onChange,
  onDelete,
  onAddSuggested,
}: {
  node: FlowNodeDefinition;
  domainPackId: string;
  onChange: (patch: Partial<FlowNodeDefinition>) => void;
  onDelete: () => void;
  onAddSuggested?: (nodeType: FlowNodeType) => void;
}) {
  const { getForm, getStage } = useStudio();
  const linkedForm = node.formTemplateId ? getForm(node.formTemplateId) : undefined;
  const sourceStage = node.sourceStageId ? getStage(node.sourceStageId) : undefined;
  const supportsFormLink = node.nodeType === "form_step" || node.nodeType === "automation" || node.nodeType === "document";

  return (
    <div className="flex flex-col gap-4">
      {sourceStage && (
        <p className="rounded-md border border-brand-500/30 bg-brand-50 px-2.5 py-2 text-[12px] text-brand-700">
          Auto-synced from the <span className="font-medium">{sourceStage.name}</span> stage.
        </p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{node.nodeType.replace(/_/g, " ")}</p>
        <button
          aria-label="Delete node"
          onClick={onDelete}
          className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Label</label>
        <input
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Detail</label>
        <input
          value={node.detail ?? ""}
          onChange={(e) => onChange({ detail: e.target.value || undefined })}
          placeholder="Optional context shown on the node"
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Assigned role tier</label>
        <select
          value={node.assignedRoleTier ?? ""}
          onChange={(e) => onChange({ assignedRoleTier: e.target.value || undefined })}
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
        >
          <option value="">Unassigned</option>
          {roleTierOptions.map((tier) => (
            <option key={tier} value={tier}>
              {tier.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {supportsFormLink && (
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            Linked form (entity)
            <InfoHint topicId="gs-entities" />
          </label>
          <EntityPicker value={node.formTemplateId ?? null} onChange={(id) => onChange({ formTemplateId: id ?? undefined })} domainPackId={domainPackId} />
          {!linkedForm && (
            <p className="mt-1 text-[11.5px] text-warn-text">Not linked — this node won&apos;t collect data until it&apos;s connected to a form.</p>
          )}
        </div>
      )}

      {onAddSuggested && suggestedNextTypes[node.nodeType].length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            Suggested next steps
            <InfoHint topicId="flow-node-types" />
          </p>
          <div className="flex flex-col gap-1">
            {suggestedNextTypes[node.nodeType].map((type) => {
              const meta = flowNodeMetaByType[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => onAddSuggested(type)}
                  title={meta.paletteHint}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border-strong px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                  Add {meta.label.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
