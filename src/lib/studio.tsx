"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { FormTemplate, FlowTemplate, Stage } from "@/types";

interface FormEntry {
  data: FormTemplate;
  dirty: boolean;
}

interface FlowEntry {
  data: FlowTemplate;
  dirty: boolean;
}

interface StageEntry {
  data: Stage;
  dirty: boolean;
}

function keyBy<T extends { id: string }>(items: T[]): Record<string, { data: T; dirty: boolean }> {
  return Object.fromEntries(items.map((item) => [item.id, { data: item, dirty: false }]));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface StudioContextValue {
  forms: FormTemplate[];
  flows: FlowTemplate[];
  stages: Stage[];
  getForm: (id: string) => FormTemplate | undefined;
  getFlow: (id: string) => FlowTemplate | undefined;
  getStage: (id: string) => Stage | undefined;
  isFormDirty: (id: string) => boolean;
  isFlowDirty: (id: string) => boolean;
  isStageDirty: (id: string) => boolean;
  updateForm: (id: string, updater: (prev: FormTemplate) => FormTemplate) => void;
  updateFlow: (id: string, updater: (prev: FlowTemplate) => FlowTemplate) => void;
  updateStage: (id: string, updater: (prev: Stage) => Stage) => void;
  publishForm: (id: string) => Promise<void>;
  publishFlow: (id: string) => Promise<void>;
  createForm: (domainPackId: string) => Promise<string>;
  createFlow: (domainPackId: string) => Promise<string>;
  createStage: (domainPackId: string) => Promise<string>;
  createFormInStage: (stageId: string) => Promise<string>;
  moveStage: (id: string, direction: -1 | 1) => Promise<void>;
  addFormToStage: (stageId: string, formId: string) => void;
  removeFormFromStage: (stageId: string, formId: string) => void;
  moveFormInStage: (stageId: string, formId: string, direction: -1 | 1) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

const PATCH_DEBOUNCE_MS = 600;

export function StudioProvider({
  initialForms,
  initialFlows,
  initialStages,
  children,
}: {
  initialForms: FormTemplate[];
  initialFlows: FlowTemplate[];
  initialStages: Stage[];
  children: React.ReactNode;
}) {
  const [forms, setForms] = useState<Record<string, FormEntry>>(() => keyBy(initialForms));
  const [flows, setFlows] = useState<Record<string, FlowEntry>>(() => keyBy(initialFlows));
  const [stages, setStages] = useState<Record<string, StageEntry>>(() => keyBy(initialStages));
  const [formOrder, setFormOrder] = useState<string[]>(() => initialForms.map((f) => f.id));
  const [flowOrder, setFlowOrder] = useState<string[]>(() => initialFlows.map((f) => f.id));
  const [stageOrder, setStageOrder] = useState<string[]>(() => initialStages.map((s) => s.id));

  // Local edits apply to state immediately; the network write to the database is debounced per
  // entity so fast typing doesn't fire a request per keystroke. Publishing flushes any pending
  // write first, so a publish never races an unsaved edit.
  const pendingSaves = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>>(new Map());

  function scheduleSave(key: string, run: () => void) {
    const existing = pendingSaves.current.get(key);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      pendingSaves.current.delete(key);
      run();
    }, PATCH_DEBOUNCE_MS);
    pendingSaves.current.set(key, { timer, run });
  }

  function flushSave(key: string) {
    const pending = pendingSaves.current.get(key);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingSaves.current.delete(key);
    pending.run();
  }

  const value = useMemo<StudioContextValue>(() => {
    function getForm(id: string) {
      return forms[id]?.data;
    }
    function getFlow(id: string) {
      return flows[id]?.data;
    }
    function getStage(id: string) {
      return stages[id]?.data;
    }

    function saveForm(id: string, data: FormTemplate) {
      patchJson<FormTemplate>(`/api/forms/${id}`, {
        name: data.name,
        description: data.description,
        category: data.category,
        fields: data.currentVersion.fields,
      })
        .then((saved) => setForms((prev) => (prev[id] ? { ...prev, [id]: { data: saved, dirty: prev[id]!.dirty } } : prev)))
        .catch((error) => console.error("Failed to save form", id, error));
    }

    function saveFlow(id: string, data: FlowTemplate) {
      patchJson<FlowTemplate>(`/api/flows/${id}`, {
        name: data.name,
        triggerLabel: data.triggerLabel,
        nodes: data.nodes,
        edges: data.edges,
      })
        .then((saved) => setFlows((prev) => (prev[id] ? { ...prev, [id]: { data: saved, dirty: prev[id]!.dirty } } : prev)))
        .catch((error) => console.error("Failed to save flow", id, error));
    }

    function saveStage(id: string, data: Stage) {
      patchJson<Stage>(`/api/stages/${id}`, {
        name: data.name,
        description: data.description,
        connectorIds: data.connectorIds,
        formTemplateIds: data.formTemplateIds,
      })
        .then((saved) => setStages((prev) => (prev[id] ? { ...prev, [id]: { data: saved, dirty: prev[id]!.dirty } } : prev)))
        .catch((error) => console.error("Failed to save stage", id, error));
    }

    function updateForm(id: string, updater: (prev: FormTemplate) => FormTemplate) {
      setForms((prev) => {
        const entry = prev[id];
        if (!entry) return prev;
        const next = updater(entry.data);
        scheduleSave(`form:${id}`, () => saveForm(id, next));
        return { ...prev, [id]: { data: next, dirty: true } };
      });
    }
    function updateFlow(id: string, updater: (prev: FlowTemplate) => FlowTemplate) {
      setFlows((prev) => {
        const entry = prev[id];
        if (!entry) return prev;
        const next = updater(entry.data);
        scheduleSave(`flow:${id}`, () => saveFlow(id, next));
        return { ...prev, [id]: { data: next, dirty: true } };
      });
    }
    function updateStage(id: string, updater: (prev: Stage) => Stage) {
      setStages((prev) => {
        const entry = prev[id];
        if (!entry) return prev;
        const next = updater(entry.data);
        scheduleSave(`stage:${id}`, () => saveStage(id, next));
        return { ...prev, [id]: { data: next, dirty: true } };
      });
    }

    async function publishForm(id: string) {
      flushSave(`form:${id}`);
      const entry = forms[id];
      if (entry) await patchJson<FormTemplate>(`/api/forms/${id}`, {
        name: entry.data.name,
        description: entry.data.description,
        category: entry.data.category,
        fields: entry.data.currentVersion.fields,
      }).catch(() => undefined);
      const published = await postJson<FormTemplate>(`/api/forms/${id}/publish`, {});
      setForms((prev) => ({ ...prev, [id]: { data: published, dirty: false } }));
    }
    async function publishFlow(id: string) {
      flushSave(`flow:${id}`);
      const entry = flows[id];
      if (entry) await patchJson<FlowTemplate>(`/api/flows/${id}`, {
        name: entry.data.name,
        triggerLabel: entry.data.triggerLabel,
        nodes: entry.data.nodes,
        edges: entry.data.edges,
      }).catch(() => undefined);
      const published = await postJson<FlowTemplate>(`/api/flows/${id}/publish`, {});
      setFlows((prev) => ({ ...prev, [id]: { data: published, dirty: false } }));
    }

    async function createForm(domainPackId: string): Promise<string> {
      const { form } = await postJson<{ form: FormTemplate }>(`/api/forms`, { domainPackId });
      setForms((prev) => ({ ...prev, [form.id]: { data: form, dirty: false } }));
      setFormOrder((prev) => [...prev, form.id]);
      return form.id;
    }
    async function createFlow(domainPackId: string): Promise<string> {
      const flow = await postJson<FlowTemplate>(`/api/flows`, { domainPackId });
      setFlows((prev) => ({ ...prev, [flow.id]: { data: flow, dirty: false } }));
      setFlowOrder((prev) => [...prev, flow.id]);
      return flow.id;
    }
    async function createStage(domainPackId: string): Promise<string> {
      const stage = await postJson<Stage>(`/api/stages`, { domainPackId });
      setStages((prev) => ({ ...prev, [stage.id]: { data: stage, dirty: false } }));
      setStageOrder((prev) => [...prev, stage.id]);
      return stage.id;
    }
    async function createFormInStage(stageId: string): Promise<string> {
      const stage = stages[stageId]?.data;
      if (!stage) throw new Error(`Unknown stage: ${stageId}`);
      const { form, stage: updatedStage } = await postJson<{ form: FormTemplate; stage?: Stage }>(`/api/forms`, {
        domainPackId: stage.domainPackId,
        stageId,
      });
      setForms((prev) => ({ ...prev, [form.id]: { data: form, dirty: false } }));
      setFormOrder((prev) => [...prev, form.id]);
      if (updatedStage) setStages((prev) => ({ ...prev, [stageId]: { data: updatedStage, dirty: false } }));
      return form.id;
    }

    async function moveStage(id: string, direction: -1 | 1) {
      const updated = await postJson<Stage[]>(`/api/stages/${id}/move`, { direction });
      setStages((prev) => {
        const next = { ...prev };
        for (const stage of updated) next[stage.id] = { data: stage, dirty: false };
        return next;
      });
      setStageOrder((prev) => {
        const updatedIds = new Set(updated.map((stage) => stage.id));
        const otherIds = prev.filter((sid) => !updatedIds.has(sid));
        return [...otherIds, ...updated.map((stage) => stage.id)];
      });
    }
    function addFormToStage(stageId: string, formId: string) {
      updateStage(stageId, (prev) => (prev.formTemplateIds.includes(formId) ? prev : { ...prev, formTemplateIds: [...prev.formTemplateIds, formId] }));
    }
    function removeFormFromStage(stageId: string, formId: string) {
      updateStage(stageId, (prev) => ({ ...prev, formTemplateIds: prev.formTemplateIds.filter((fid) => fid !== formId) }));
    }
    function moveFormInStage(stageId: string, formId: string, direction: -1 | 1) {
      updateStage(stageId, (prev) => {
        const index = prev.formTemplateIds.indexOf(formId);
        const targetIndex = index + direction;
        if (index === -1 || targetIndex < 0 || targetIndex >= prev.formTemplateIds.length) return prev;
        const next = [...prev.formTemplateIds];
        const tmp = next[index]!;
        next[index] = next[targetIndex]!;
        next[targetIndex] = tmp;
        return { ...prev, formTemplateIds: next };
      });
    }

    return {
      forms: formOrder.map((id) => forms[id]?.data).filter((f): f is FormTemplate => Boolean(f)),
      flows: flowOrder.map((id) => flows[id]?.data).filter((f): f is FlowTemplate => Boolean(f)),
      stages: stageOrder.map((id) => stages[id]?.data).filter((s): s is Stage => Boolean(s)),
      getForm,
      getFlow,
      getStage,
      isFormDirty: (id) => forms[id]?.dirty ?? false,
      isFlowDirty: (id) => flows[id]?.dirty ?? false,
      isStageDirty: (id) => stages[id]?.dirty ?? false,
      updateForm,
      updateFlow,
      updateStage,
      publishForm,
      publishFlow,
      createForm,
      createFlow,
      createStage,
      createFormInStage,
      moveStage,
      addFormToStage,
      removeFormFromStage,
      moveFormInStage,
    };
  }, [forms, flows, stages, formOrder, flowOrder, stageOrder]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
}
