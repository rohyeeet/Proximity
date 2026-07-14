"use client";

import { Trash2 } from "lucide-react";
import { FieldPicker } from "./FieldPicker";
import { InfoHint } from "./knowledge/InfoHint";
import { useStudio } from "@/lib/studio";
import { findUpstreamFormTemplateId } from "@/lib/flow-conditions";
import type { FlowConditionOperator, FlowEdgeDefinition, FlowTemplate } from "@/types";

const kindOptions: FlowEdgeDefinition["kind"][] = ["sequential", "parallel", "conditional", "correction"];
const operatorOptions: { value: FlowConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
];

export function FlowEdgeInspector({
  flow,
  edge,
  onChange,
  onDelete,
}: {
  flow: FlowTemplate;
  edge: FlowEdgeDefinition;
  onChange: (patch: Partial<FlowEdgeDefinition>) => void;
  onDelete: () => void;
}) {
  const { getForm } = useStudio();
  const upstreamFormId = findUpstreamFormTemplateId(flow, edge.fromNodeId);
  const upstreamForm = upstreamFormId ? getForm(upstreamFormId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Edge</p>
        <button
          aria-label="Delete edge"
          onClick={onDelete}
          className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div>
        <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
          Kind
          <InfoHint topicId="flow-edge-kinds" />
        </label>
        <select
          value={edge.kind}
          onChange={(e) => onChange({ kind: e.target.value as FlowEdgeDefinition["kind"] })}
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
        >
          {kindOptions.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Condition label</label>
        <input
          value={edge.conditionLabel ?? ""}
          onChange={(e) => onChange({ conditionLabel: e.target.value || undefined })}
          placeholder="e.g. approve"
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
        />
      </div>

      {edge.kind === "conditional" && (
        <div className="rounded-md border border-border bg-sunken px-3 py-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
            Rule (BRE)
            <InfoHint topicId="flow-conditions" />
          </p>
          {!upstreamForm ? (
            <p className="text-[12px] text-ink-soft">Link an upstream node to a form to build a field-based rule.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-ink-soft">From {upstreamForm.name}</p>
              <FieldPicker
                fields={upstreamForm.currentVersion.fields}
                value={edge.condition?.fieldCode ?? null}
                onChange={(fieldCode) =>
                  onChange({
                    condition: fieldCode
                      ? { fieldCode, operator: edge.condition?.operator ?? "equals", value: edge.condition?.value ?? "" }
                      : undefined,
                  })
                }
                placeholder="Pick a field…"
              />
              {edge.condition && (
                <div className="flex items-center gap-2">
                  <select
                    value={edge.condition.operator}
                    onChange={(e) => onChange({ condition: { ...edge.condition!, operator: e.target.value as FlowConditionOperator } })}
                    className="rounded-md border border-border-strong bg-paper px-2 py-1.5 text-[13px] text-ink"
                  >
                    {operatorOptions.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={edge.condition.value}
                    onChange={(e) => onChange({ condition: { ...edge.condition!, value: e.target.value } })}
                    placeholder="value"
                    className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-soft/60"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
