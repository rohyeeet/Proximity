"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio, pickActiveFlow } from "@/lib/studio";
import { getAssignedWork } from "@/lib/collect";
import type { Submission } from "@/types";

export default function CollectHomePage() {
  const { session } = useSession();
  const { forms, flows, stages, projects } = useStudio();
  const [mySubmissions, setMySubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    fetch("/api/submissions/mine")
      .then((res) => res.json())
      .then((data) => setMySubmissions(Array.isArray(data) ? data : []))
      .catch((error) => console.error("Failed to load my submissions", error));
  }, []);

  // A submitter can be assigned work across more than one of the org's projects — gather each
  // project's active flow separately rather than assuming a single org-wide flow.
  const orgProjects = projects.filter((p) => p.organizationId === session.organization.id);
  const assigned = orgProjects.flatMap((project) => {
    const flow = pickActiveFlow(flows, project.id);
    return getAssignedWork(flow, forms, stages, session.role.tier, project.id, project.name);
  });

  const needsFixCount = mySubmissions?.filter((s) => s.reviewStatus === "needs_fix").length ?? 0;
  const pendingCount = mySubmissions?.filter((s) => s.reviewStatus === "needs_check").length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">Hi, {session.user.fullName.split(" ")[0]}</h1>
        <p className="text-[13px] text-ink-soft">Forms assigned to you in {session.organization.name}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/collect/submissions?status=needs_fix"
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5"
        >
          <div className="flex items-center gap-1.5 text-critical-text">
            <AlertTriangle className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Needs correction</span>
          </div>
          <p className="text-2xl font-semibold text-ink tabular-nums">{needsFixCount}</p>
        </Link>
        <Link href="/collect/submissions?status=needs_check" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5">
          <div className="flex items-center gap-1.5 text-ink-soft">
            <Clock className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Awaiting review</span>
          </div>
          <p className="text-2xl font-semibold text-ink tabular-nums">{pendingCount}</p>
        </Link>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Your forms ({assigned.length})</p>
        {assigned.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-strong bg-surface p-4 text-center text-[13px] text-ink-soft">
            No forms are assigned to you yet — check back once your admin sets up your flow.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {assigned.map(({ form, stage, flowNodeLabel, projectId, projectName }) => (
            <Link
              key={`${projectId}-${form.id}`}
              href={`/collect/forms/${form.id}?project=${projectId}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 active:bg-sunken"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                <ClipboardList className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{flowNodeLabel}</p>
                <p className="truncate text-[12px] text-ink-soft">
                  {stage ? stage.name : form.name}
                  {orgProjects.length > 1 && ` · ${projectName}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-ink-soft/60" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
