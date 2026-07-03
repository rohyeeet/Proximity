"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio, canDeleteStage } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchPicker } from "@/components/ui/SearchPicker";
import { EditableText } from "@/components/ui/EditableText";
import { Modal } from "@/components/ui/Modal";
import { ConnectorPicker } from "./ConnectorPicker";
import { KnowledgeProvider, useKnowledge } from "./knowledge/KnowledgeContext";
import { KnowledgeDrawer } from "./knowledge/KnowledgeDrawer";
import { InfoHint } from "./knowledge/InfoHint";
import type { FormTemplate, Stage } from "@/types";

export function StageBoardClient() {
  return (
    <KnowledgeProvider scope="form">
      <StageBoardInner />
    </KnowledgeProvider>
  );
}

function StageBoardInner() {
  const router = useRouter();
  const { session } = useSession();
  const { openList } = useKnowledge();
  const {
    stages,
    forms,
    flows,
    createStage,
    deleteStage,
    moveStage,
    updateStage,
    createFormInStage,
    addFormToStage,
    removeFormFromStage,
    moveFormInStage,
    createFlow,
  } = useStudio();

  const canEdit = canEditStudio(session.role.tier);
  const canDelete = canDeleteStage(session.role.tier);
  const domainPackId = session.organization.domainPackId;
  const orgStages = stages.filter((stage) => stage.domainPackId === domainPackId);
  const stagedFormIds = new Set(orgStages.flatMap((stage) => stage.formTemplateIds));
  const availableForms = forms.filter((form) => form.domainPackId === domainPackId && !stagedFormIds.has(form.id));
  const domainFlow = flows.find((flow) => flow.domainPackId === domainPackId);

  async function handleViewFlow() {
    if (domainFlow) {
      router.push(`/flows/${domainFlow.id}`);
    } else if (canEdit) {
      const id = await createFlow(domainPackId);
      router.push(`/flows/${id}`);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Forms & Stages"
        description="Build the stages your process moves through and the forms captured at each one — the flow is built from this."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={openList}>
              <BookOpen className="size-3.5" /> Guide
            </Button>
            <Button variant="secondary" onClick={handleViewFlow} disabled={!domainFlow && !canEdit}>
              View flow <ArrowRight className="size-3.5" />
            </Button>
          </div>
        }
      />

      <KnowledgeDrawer />

      <div className="flex flex-col gap-4">
        {orgStages.length === 0 && (
          <EmptyState title="No stages yet." description="Create your first stage to start grouping forms into your process." />
        )}
        {orgStages.map((stage, index) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={index}
            isFirst={index === 0}
            isLast={index === orgStages.length - 1}
            allForms={forms}
            availableForms={availableForms}
            organizationId={session.organization.id}
            canEdit={canEdit}
            canDelete={canDelete}
            onMove={(direction) => moveStage(stage.id, direction)}
            onDeleteStage={() => deleteStage(stage.id)}
            onChange={(patch) => updateStage(stage.id, (prev) => ({ ...prev, ...patch }))}
            onNewForm={async () => {
              const id = await createFormInStage(stage.id);
              router.push(`/forms/${id}`);
            }}
            onAddExisting={(formId) => addFormToStage(stage.id, formId)}
            onRemoveForm={(formId) => removeFormFromStage(stage.id, formId)}
            onMoveForm={(formId, direction) => moveFormInStage(stage.id, formId, direction)}
          />
        ))}
      </div>

      {canEdit && (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => createStage(domainPackId)}>
            <Plus className="size-3.5" /> New stage
          </Button>
        </div>
      )}
    </div>
  );
}

function StageCard({
  stage,
  index,
  isFirst,
  isLast,
  allForms,
  availableForms,
  organizationId,
  canEdit,
  canDelete,
  onMove,
  onDeleteStage,
  onChange,
  onNewForm,
  onAddExisting,
  onRemoveForm,
  onMoveForm,
}: {
  stage: Stage;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  allForms: FormTemplate[];
  availableForms: FormTemplate[];
  organizationId: string;
  canEdit: boolean;
  canDelete: boolean;
  onMove: (direction: -1 | 1) => void;
  onDeleteStage: () => void;
  onChange: (patch: Partial<Stage>) => void;
  onNewForm: () => void;
  onAddExisting: (formId: string) => void;
  onRemoveForm: (formId: string) => void;
  onMoveForm: (formId: string, direction: -1 | 1) => void;
}) {
  const [addingExisting, setAddingExisting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const formsById = new Map(allForms.map((form) => [form.id, form]));
  const stageForms = stage.formTemplateIds.map((id) => formsById.get(id)).filter((form): form is FormTemplate => Boolean(form));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-medium text-ink-soft">
              {index + 1}
            </span>
            <EditableText
              value={stage.name}
              onChange={(name) => onChange({ name })}
              canEdit={canEdit}
              wrapperClassName="flex min-w-0 flex-1 items-center gap-1.5"
              textClassName="text-[16px] font-semibold text-ink"
            />
            <InfoHint topicId="stages-overview" />
          </div>
          <div className="ml-7">
            <EditableText
              value={stage.description ?? ""}
              onChange={(description) => onChange({ description: description || undefined })}
              canEdit={canEdit}
              placeholder="What happens in this stage"
              wrapperClassName="flex w-full items-center gap-1.5"
              textClassName="text-[13px] text-ink-soft"
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Move stage up"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              aria-label="Move stage down"
              disabled={isLast}
              onClick={() => onMove(1)}
              className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
            >
              <ArrowDown className="size-4" />
            </button>
            {canDelete && (
              <button
                aria-label="Delete stage"
                onClick={() => setConfirmingDelete(true)}
                className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete "${stage.name}"?`}
        description="This action is permanent and cannot be undone."
      >
        <div className="flex flex-col gap-3">
          {stage.formTemplateIds.length > 0 && (
            <p className="rounded-md border border-warn-text/30 bg-warn-bg px-3 py-2 text-[13px] text-warn-text">
              {stage.formTemplateIds.length} form{stage.formTemplateIds.length > 1 ? "s are" : " is"} currently assigned to this stage.
              They won&apos;t be deleted, but will be unassigned from any stage.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDeleteStage();
                  setConfirmingDelete(false);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete stage"}
            </Button>
          </div>
        </div>
      </Modal>

      {(canEdit || stage.connectorIds.length > 0) && (
        <div className="mb-3 ml-7 flex items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
            Connectors
            <InfoHint topicId="stages-connectors" />
          </span>
          <div className="max-w-xs flex-1">
            {canEdit ? (
              <ConnectorPicker organizationId={organizationId} values={stage.connectorIds} onChange={(ids) => onChange({ connectorIds: ids })} />
            ) : (
              <p className="text-[12px] text-ink-soft">{stage.connectorIds.length} connector(s) bound</p>
            )}
          </div>
        </div>
      )}

      <div className="ml-7 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {stageForms.map((form, fi) => (
          <div key={form.id} className="flex flex-col gap-2 rounded-lg border border-border bg-paper px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/forms/${form.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate font-medium text-ink">{form.name}</p>
              </Link>
              <span className="whitespace-nowrap text-[11px] text-ink-soft">v{form.currentVersion.versionNo}</span>
            </div>
            <p className="line-clamp-2 text-[13px] text-ink-soft">{form.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink-soft">{form.currentVersion.fields.length} fields</span>
              {form.needsFixCount > 0 && <StatusChip label={`${form.needsFixCount} Needs Fix`} tone="critical" />}
              {form.needsCheckCount > 0 && <StatusChip label={`${form.needsCheckCount} Needs Check`} tone="accent" />}
            </div>
            {canEdit && (
              <div className="mt-1 flex items-center gap-1 border-t border-border pt-2">
                <button
                  aria-label="Move form up"
                  disabled={fi === 0}
                  onClick={() => onMoveForm(form.id, -1)}
                  className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  aria-label="Move form down"
                  disabled={fi === stageForms.length - 1}
                  onClick={() => onMoveForm(form.id, 1)}
                  className="flex size-6 items-center justify-center rounded text-ink-soft hover:bg-sunken disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  aria-label="Remove from stage"
                  onClick={() => onRemoveForm(form.id)}
                  className="ml-auto flex size-6 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {canEdit && (
          <div className="flex flex-col items-stretch justify-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-3.5">
            <Button variant="secondary" size="sm" onClick={onNewForm}>
              <Plus className="size-3.5" /> New form
            </Button>
            {addingExisting ? (
              <SearchPicker<FormTemplate>
                items={availableForms}
                getId={(form) => form.id}
                renderRow={(form) => form.name}
                filter={(form, q) => form.name.toLowerCase().includes(q)}
                value={null}
                onChange={(id) => {
                  if (id) onAddExisting(id);
                  setAddingExisting(false);
                }}
                placeholder="Pick an existing form…"
                emptyLabel="No unassigned forms in this domain pack"
                clearable={false}
              />
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingExisting(true)} disabled={availableForms.length === 0}>
                Add existing form
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
