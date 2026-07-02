"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import type { OrgMembership, Role, User } from "@/types";

const tierLabel: Record<string, string> = {
  org_admin: "Org Admin",
  org_sub_admin: "Org Sub-Admin",
  designer: "Designer",
  submitter: "Submitter",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

interface MemberRow {
  membership: OrgMembership;
  user: User;
  role: Role;
}

export default function TeamPage() {
  const { session } = useSession();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [orgRoles, setOrgRoles] = useState<Role[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organizations/${session.organization.id}/team`)
      .then((res) => res.json())
      .then((data: { members: MemberRow[]; roles: Role[] }) => {
        if (!cancelled) {
          setMembers(data.members);
          setOrgRoles(data.roles);
        }
      })
      .catch((error) => console.error("Failed to load team", error));
    return () => {
      cancelled = true;
    };
  }, [session.organization.id]);

  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-sunken text-[10px] font-semibold text-ink">{row.user?.avatarInitials}</div>
          <span className="font-medium text-ink">{row.user?.fullName}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (row) => <span className="text-ink-soft">{row.user?.email}</span> },
    { key: "role", header: "Role", render: (row) => <span className="text-ink-soft">{row.role?.name}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusChip
          label={row.membership.status}
          tone={row.membership.status === "active" ? "good" : row.membership.status === "invited" ? "accent" : "critical"}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Team & Access"
        description="Custom roles composed from the platform's five permission primitives, scoped to whatever projects an Org Admin decides."
        actions={<Button variant="primary">Invite user</Button>}
      />

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Members</h2>
      <DataTable columns={columns} rows={members} rowKey={(row) => row.membership.id} />

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Roles</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {orgRoles.map((role) => (
          <Link
            key={role.id}
            href={`/team/roles/${role.id}`}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5 hover:border-border-strong hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{role.name}</p>
              <StatusChip label={tierLabel[role.tier] ?? role.tier} tone="accent" />
            </div>
            <p className="text-[13px] text-ink-soft">{role.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
