"use client";

import { SessionProvider } from "@/lib/session";
import { StudioProvider } from "@/lib/studio";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { FlowTemplate, FormTemplate, Organization, Role, Stage, User } from "@/types";

export function AppShell({
  user,
  accessibleOrgs,
  isPlatformAdmin,
  initialActiveOrganizationId,
  initialForms,
  initialFlows,
  initialStages,
  children,
}: {
  user: User;
  accessibleOrgs: { organization: Organization; role: Role }[];
  isPlatformAdmin: boolean;
  initialActiveOrganizationId: string;
  initialForms: FormTemplate[];
  initialFlows: FlowTemplate[];
  initialStages: Stage[];
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      user={user}
      accessibleOrgs={accessibleOrgs}
      isPlatformAdmin={isPlatformAdmin}
      initialActiveOrganizationId={initialActiveOrganizationId}
    >
      <StudioProvider initialForms={initialForms} initialFlows={initialFlows} initialStages={initialStages}>
        <div className="flex min-h-screen bg-paper">
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
