import type { FlowTemplate } from "@/types";

/**
 * The one flow that actually drives real behavior for a project — Collect's assigned-work list,
 * the Overview flow summary, and real-time submission collection all need exactly one answer, but
 * a project can have more than one `FlowTemplate` row (e.g. someone clicked "New flow" to sketch
 * an alternative without ever meaning to replace the real one). Prefers a published flow over a
 * draft, then the highest version number — the flow that's actually been iterated on and shipped,
 * not whichever row a plain `.find()` happens to return first.
 *
 * Plain function, no client/server dependency — shared by the client Studio context
 * (`src/lib/studio.tsx`) and server-side API routes alike.
 */
export function pickActiveFlow(flows: FlowTemplate[], projectId: string): FlowTemplate | undefined {
  return flows
    .filter((flow) => flow.projectId === projectId)
    .sort((a, b) => Number(b.status === "published") - Number(a.status === "published") || b.versionNo - a.versionNo)[0];
}
