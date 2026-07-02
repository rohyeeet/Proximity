"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CurrentSession, Organization, Role, User } from "@/types";

interface AccessibleOrg {
  organization: Organization;
  role: Role;
}

interface SessionContextValue {
  session: CurrentSession;
  organizations: Organization[];
  setActiveOrganizationId: (organizationId: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const ORG_COOKIE = "activeOrganizationId";

/**
 * `accessibleOrgs` and `user` are resolved server-side (see src/app/(app)/layout.tsx) from the
 * real authenticated session + database — a platform admin gets every organization paired with
 * the platform role, everyone else gets exactly the organizations/roles their OrgMemberships
 * grant. Switching orgs client-side is just picking from this pre-fetched list, no refetch needed.
 */
export function SessionProvider({
  user,
  accessibleOrgs,
  isPlatformAdmin,
  initialActiveOrganizationId,
  children,
}: {
  user: User;
  accessibleOrgs: AccessibleOrg[];
  isPlatformAdmin: boolean;
  initialActiveOrganizationId: string;
  children: React.ReactNode;
}) {
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(initialActiveOrganizationId);

  function setActiveOrganizationId(organizationId: string) {
    setActiveOrganizationIdState(organizationId);
    if (typeof document !== "undefined") {
      document.cookie = `${ORG_COOKIE}=${organizationId}; path=/; max-age=31536000; samesite=lax`;
    }
  }

  const session = useMemo<CurrentSession>(() => {
    const match = accessibleOrgs.find((entry) => entry.organization.id === activeOrganizationId) ?? accessibleOrgs[0];
    if (!match) {
      throw new Error("No accessible organization for the current user");
    }
    return { user, organization: match.organization, role: match.role, isPlatformAdmin };
  }, [activeOrganizationId, accessibleOrgs, user, isPlatformAdmin]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      organizations: accessibleOrgs.map((entry) => entry.organization),
      setActiveOrganizationId,
    }),
    [session, accessibleOrgs]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
