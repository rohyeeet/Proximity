"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { flowNodeCatalog } from "./flow-node-catalog";
import { InfoHint } from "./knowledge/InfoHint";
import type { FlowNodeType } from "@/types";

export function FlowNodePalette({
  onAddNode,
  hasSelection,
  collapsed,
  onToggleCollapsed,
}: {
  onAddNode: (type: FlowNodeType) => void;
  hasSelection: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface p-2">
        <button
          aria-label="Expand module palette"
          onClick={onToggleCollapsed}
          className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="mt-1 flex flex-col gap-0.5">
          {flowNodeCatalog.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.type}
                onClick={() => onAddNode(meta.type)}
                title={`${meta.label} — ${meta.paletteHint}`}
                aria-label={meta.label}
                className="flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-sunken hover:text-ink"
              >
                <Icon className="size-4" strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
          Modules
          <InfoHint topicId="flow-node-types" />
        </p>
        <button
          aria-label="Collapse module palette"
          onClick={onToggleCollapsed}
          className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <p className="px-1 text-[11.5px] leading-snug text-ink-soft">
        {hasSelection ? "Click a module to stack it after the selected node." : "Click a module to add it to the canvas."}
      </p>
      <div className="flex flex-col gap-1">
        {flowNodeCatalog.map((meta) => {
          const Icon = meta.icon;
          return (
            <button
              key={meta.type}
              onClick={() => onAddNode(meta.type)}
              title={meta.description}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sunken"
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-ink-soft" strokeWidth={2} />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{meta.label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-soft">{meta.paletteHint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
