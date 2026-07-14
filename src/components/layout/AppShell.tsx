"use client";

import { SessionProvider } from "@/lib/session";
import { StudioProvider } from "@/lib/studio";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { FlowTemplate, FormTemplate, Organization, Project, Role, Stage, User } from "@/types";

export function AppShell({
  user,
  accessibleOrgs,
  isPlatformAdmin,
  initialActiveOrganizationId,
  initialForms,
  initialFlows,
  initialStages,
  initialProjects,
  children,
}: {
  user: User;
  accessibleOrgs: { organization: Organization; role: Role }[];
  isPlatformAdmin: boolean;
  initialActiveOrganizationId: string;
  initialForms: FormTemplate[];
  initialFlows: FlowTemplate[];
  initialStages: Stage[];
  initialProjects: Project[];
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      user={user}
      accessibleOrgs={accessibleOrgs}
      isPlatformAdmin={isPlatformAdmin}
      initialActiveOrganizationId={initialActiveOrganizationId}
    >
      {/* Remounts the whole Studio store when the active org changes, so its state resets to the
          freshly-scoped initialForms/initialFlows/initialStages/initialProjects the server just
          recomputed for the newly active org — StudioProvider only reads its initial* props on
          first mount (lazy useState initializers), so without this key it would keep showing the
          previous org's data until a hard page reload. */}
      <StudioProvider
        key={initialActiveOrganizationId}
        initialForms={initialForms}
        initialFlows={initialFlows}
        initialStages={initialStages}
        initialProjects={initialProjects}
      >
        <div className="flex h-screen overflow-hidden bg-paper">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto px-8 py-6">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </StudioProvider>
    </SessionProvider>
  );
}
