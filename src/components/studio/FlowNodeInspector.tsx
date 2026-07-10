"use client";

import { Trash2, X } from "lucide-react";
import { EntityPicker } from "./EntityPicker";
import { FieldPicker } from "./FieldPicker";
import { InfoHint } from "./knowledge/InfoHint";
import { flowNodeMetaByType, suggestedNextTypes } from "./flow-node-catalog";
import { useStudio } from "@/lib/studio";
import type { FlowNodeDefinition, FlowNodeType, TrackerAggregation } from "@/types";

const roleTierOptions = ["submitter", "reviewer", "org_admin", "org_sub_admin", "designer", "viewer"];

const trackerAggregationLabels: Record<TrackerAggregation, string> = { sum: "SUM", avg: "AVG", min: "MIN", max: "MAX" };

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
      <div>
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
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{flowNodeMetaByType[node.nodeType].description}</p>
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

      {supportsFormLink && linkedForm && (
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            Tracker
            <InfoHint topicId="flow-tracker" />
          </label>
          <p className="mb-1.5 text-[11.5px] leading-snug text-ink-soft">
            Roll up a live metric from this form&apos;s submissions, shown on the Overview flow summary.
          </p>
          <div className="flex flex-col gap-1.5 rounded-md border border-border-strong bg-paper p-2.5">
            <FieldPicker
              fields={linkedForm.currentVersion.fields}
              matchFieldType="number"
              value={node.tracker?.fieldCode ?? null}
              onChange={(fieldCode) =>
                onChange({
                  tracker: fieldCode ? { fieldCode, aggregation: node.tracker?.aggregation ?? "sum", label: node.tracker?.label } : undefined,
                })
              }
              placeholder="Pick a numeric field to track…"
            />
            {node.tracker && (
              <>
                <select
                  value={node.tracker.aggregation}
                  onChange={(e) => onChange({ tracker: { ...node.tracker!, aggregation: e.target.value as TrackerAggregation } })}
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13.5px] text-ink"
                >
                  {Object.entries(trackerAggregationLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onChange({ tracker: undefined })}
                  className="flex items-center gap-1 self-start text-[12px] font-medium text-ink-soft hover:text-critical-text"
                >
                  <X className="size-3.5" /> Clear tracker
                </button>
              </>
            )}
            {linkedForm.currentVersion.fields.every((f) => f.fieldType !== "number") && (
              <p className="text-[11.5px] text-ink-soft">This form has no numeric fields to track yet.</p>
            )}
          </div>
        </div>
      )}

      {onAddSuggested && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            Suggested next steps
            <InfoHint topicId="flow-node-types" />
          </p>
          {suggestedNextTypes[node.nodeType].length > 0 ? (
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
          ) : (
            <p className="rounded-md border border-dashed border-border bg-sunken px-2.5 py-2 text-[12px] text-ink-soft">
              {node.nodeType === "milestone"
                ? "Milestones are terminal — nothing typically follows this step."
                : "Nothing specific is suggested after this step. Pick a module from the palette on the left instead."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
