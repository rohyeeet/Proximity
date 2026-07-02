import { notFound } from "next/navigation";
import { getRole } from "@/lib/queries";
import { RoleEditorClient } from "@/components/admin/RoleEditorClient";

export default async function RoleEditorPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const role = await getRole(roleId);
  if (!role) notFound();

  return <RoleEditorClient role={role} />;
}
