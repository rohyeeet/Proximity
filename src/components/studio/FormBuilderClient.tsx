"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cn, genId } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditableText } from "@/components/ui/EditableText";
import { fieldTypeCatalog, fieldTypeMetaByType } from "./field-type-catalog";
import { EntityPicker } from "./EntityPicker";
import { LookupSourceEditor } from "./LookupSourceEditor";
import { LinkFilterEditor } from "./LinkFilterEditor";
import { ValidationRuleEditor } from "./ValidationRuleEditor";
import { VisibilityRuleEditor } from "./VisibilityRuleEditor";
import { FormPreviewPanel } from "./FormPreviewPanel";
import { KnowledgeProvider, useKnowledge } from "./knowledge/KnowledgeContext";
import { KnowledgeDrawer } from "./knowledge/KnowledgeDrawer";
import { InfoHint } from "./knowledge/InfoHint";
import { useStudio } from "@/lib/studio";
import { useSession } from "@/lib/session";
import { canEditStudio } from "@/lib/permissions";
import type { FormFieldDefinition } from "@/types";

function createField(type: FormFieldDefinition["fieldType"], sortOrder: number): FormFieldDefinition {
  const id = genId("field");
  const meta = fieldTypeMetaByType[type];
  return {
    id,
    fieldCode: id.replace(/-/g, "_"),
    label: `New ${meta.label.toLowerCase()}`,
    fieldType: type,
    isRequired: false,
    sortOrder,
    validations: [],
  };
}

export function FormBuilderClient({ formId }: { formId: string }) {
  return (
    <KnowledgeProvider scope="form">
      <FormBuilderInner formId={formId} />
    </KnowledgeProvider>
  );
}

function FormBuilderInner({ formId }: { formId: string }) {
  const { getForm, updateForm, publishForm, isFormDirty } = useStudio();
  const { openList } = useKnowledge();
  const { session } = useSession();
  const canEdit = canEditStudio(session.role.tier);
  const form = getForm(formId);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(form?.currentVersion.fields[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  if (!form) {
    return <EmptyState title="This form no longer exists." />;
  }

  const fields = form.currentVersion.fields;
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const dirty = isFormDirty(form.id);

  const setFields = (updater: (prev: FormFieldDefinition[]) => FormFieldDefinition[]) => {
    updateForm(form.id, (prev) => ({ ...prev, currentVersion: { ...prev.currentVersion, fields: updater(prev.currentVersion.fields) } }));
  };

  function addField(type: FormFieldDefinition["fieldType"]) {
    const field = createField(type, fields.length + 1);
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  }

  function updateField(id: string, patch: Partial<FormFieldDefinition>) {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function moveField(id: string, direction: -1 | 1) {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <EditableText
              value={form.name}
              onChange={(name) => updateForm(form.id, (prev) => ({ ...prev, name }))}
              canEdit={canEdit}
              as="h1"
              wrapperClassName="flex min-w-0 flex-1 items-center gap-1.5"
              textClassName="text-xl font-semibold text-ink"
            />
            <StatusChip
              label={form.currentVersion.status === "published" ? "Live" : "Draft"}
              tone={form.currentVersion.status === "published" ? "good" : "hold"}
            />
            {!canEdit && <StatusChip label="View only" tone="hold" />}
          </div>
          <EditableText
            value={form.description}
            onChange={(description) => updateForm(form.id, (prev) => ({ ...prev, description }))}
            canEdit={canEdit}
            placeholder="What this form captures"
            wrapperClassName="flex w-full items-center gap-1.5"
            textClassName="text-sm text-ink-soft"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={openList}>
            <BookOpen className="size-3.5" /> Guide
          </Button>
          <Button variant="secondary" onClick={() => setPreviewOpen((o) => !o)}>
            {previewOpen ? "Back to editor" : "Preview"}
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={() => publishForm(form.id)} disabled={form.currentVersion.status === "published" && !dirty}>
              {form.currentVersion.status === "published" && !dirty ? `v${form.currentVersion.versionNo} published` : `Publish v${form.currentVersion.versionNo}`}
            </Button>
          )}
        </div>
      </div>

      <KnowledgeDrawer />

      {previewOpen ? (
        <FormPreviewPanel form={form} />
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: canEdit ? `${paletteCollapsed ? "48px" : "200px"} 1fr 300px` : "1fr 300px" }}
        >
          {canEdit &&
            (paletteCollapsed ? (
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface p-2">
                <button
                  aria-label="Expand field palette"
                  onClick={() => setPaletteCollapsed(false)}
                  className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
                <div className="mt-1 flex flex-col gap-0.5">
                  {fieldTypeCatalog.flatMap((group) => group.types).map((meta) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={meta.type}
                        onClick={() => addField(meta.type)}
                        title={meta.label}
                        aria-label={meta.label}
                        className="flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-sunken hover:text-ink"
                      >
                        <Icon className="size-4" strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Field types</p>
                    <InfoHint topicId="form-field-types" />
                  </div>
                  <button
                    aria-label="Collapse field palette"
                    onClick={() => setPaletteCollapsed(true)}
                    className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
                {fieldTypeCatalog.map((group) => (
                  <div key={group.category}>
                    <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">{group.category}</p>
                    <div className="flex flex-col gap-0.5">
                      {group.types.map((meta) => {
                        const Icon = meta.icon;
                        return (
                          <button
                            key={meta.type}
                            onClick={() => addField(meta.type)}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink-soft hover:bg-sunken hover:text-ink"
                          >
                            <Icon className="size-3.5" strokeWidth={2} />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          <div className="flex flex-col gap-2">
            {fields.length === 0 && <EmptyState title="Add a field from the palette to start building." />}
            {fields.map((field, index) => {
              const meta = fieldTypeMetaByType[field.fieldType];
              const Icon = meta.icon;
              const isSelected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border bg-surface px-3.5 py-2.5",
                    isSelected ? "border-brand-500 ring-1 ring-brand-500/20" : "border-border hover:border-border-strong"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-ink-soft" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{field.label}</p>
                    <p className="truncate text-[12px] text-ink-soft">
                      {meta.label}
                      {field.unit ? ` · ${field.unit}` : ""}
                      {field.lookupSource ? ` · from ${field.lookupSource.label || "unset source"}${field.lookupSource.filter ? " (filtered)" : ""}` : ""}
                      {field.linkedFormTemplateId ? ` · links to another entity${field.linkedFilter ? " (filtered)" : ""}` : ""}
                    </p>
                  </div>
                  {field.isRequired && <StatusChip label="Required" tone="hold" />}
                  {canEdit && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => moveField(field.id, -1)}
                        className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        aria-label="Move down"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(field.id, 1)}
                        className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        aria-label="Delete field"
                        onClick={() => removeField(field.id)}
                        className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="overflow-y-auto rounded-lg border border-border bg-surface p-4">
            {selectedField ? (
              <fieldset disabled={!canEdit} className="contents border-0 p-0 m-0">
                <FieldPropertiesPanel
                  field={selectedField}
                  allFields={fields}
                  domainPackId={form.domainPackId}
                  onChange={(patch) => updateField(selectedField.id, patch)}
                />
              </fieldset>
            ) : (
              <p className="text-sm text-ink-soft">Select a field to edit its properties.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPropertiesPanel({
  field,
  allFields,
  domainPackId,
  onChange,
}: {
  field: FormFieldDefinition;
  allFields: FormFieldDefinition[];
  domainPackId: string;
  onChange: (patch: Partial<FormFieldDefinition>) => void;
}) {
  const { getForm } = useStudio();
  const linkedForm = field.linkedFormTemplateId ? getForm(field.linkedFormTemplateId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Label</label>
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
        />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-ink-soft">Helper text</label>
        <input
          value={field.helperText ?? ""}
          onChange={(e) => onChange({ helperText: e.target.value })}
          placeholder="Shown under the field to guide the submitter"
          className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">Unit</label>
          <input
            value={field.unit ?? ""}
            onChange={(e) => onChange({ unit: e.target.value || undefined })}
            placeholder="e.g. kg, km"
            className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
          />
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap pb-1.5 text-[13px] text-ink">
          <input type="checkbox" checked={field.isRequired} onChange={(e) => onChange({ isRequired: e.target.checked })} className="size-3.5 accent-brand-500" />
          Required
        </label>
      </div>

      {field.fieldType === "lookup_select" && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">Lookup source</p>
          <LookupSourceEditor lookupSource={field.lookupSource} domainPackId={domainPackId} onChange={(next) => onChange({ lookupSource: next })} />
        </div>
      )}

      {field.fieldType === "linked_record" && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
            Linked entity
            <InfoHint topicId="form-linked-record" />
          </p>
          <p className="mb-1.5 text-[12px] text-ink-soft">Which entity does the follow-up record get created against?</p>
          <EntityPicker
            value={field.linkedFormTemplateId ?? null}
            domainPackId={domainPackId}
            onChange={(id) => onChange({ linkedFormTemplateId: id ?? undefined, linkedFilter: undefined })}
          />
          {linkedForm && (
            <div className="mt-2">
              <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
                Filter by column and value
                <InfoHint topicId="form-link-filters" />
              </label>
              <LinkFilterEditor
                filter={field.linkedFilter}
                fields={linkedForm.currentVersion.fields}
                onChange={(filter) => onChange({ linkedFilter: filter })}
              />
            </div>
          )}
        </div>
      )}

      {field.fieldType === "calculated_field" && (
        <div className="rounded-md border border-border bg-sunken px-3 py-2.5">
          <p className="text-[12px] text-ink-soft">This field&apos;s value is computed automatically and can&apos;t be edited by submitters.</p>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <ValidationRuleEditor
          rules={field.validations}
          fields={allFields}
          excludeFieldCode={field.fieldCode}
          ownFieldType={field.fieldType}
          onChange={(rules) => onChange({ validations: rules })}
        />
      </div>

      <div className="border-t border-border pt-4">
        <VisibilityRuleEditor field={field} fields={allFields} onChange={(rules) => onChange({ visibilityRules: rules })} />
      </div>
    </div>
  );
}
