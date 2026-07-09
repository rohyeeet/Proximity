"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  FileText,
  Workflow,
  Table2,
  Cable,
  BarChart3,
  Users,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";

const orgNav = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/forms", label: "Forms", icon: FileText },
  { href: "/flows", label: "Flows", icon: Workflow },
  { href: "/records", label: "Records", icon: Table2 },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/connectors", label: "Connectors", icon: Cable },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team & Access", icon: Users },
];

const STORAGE_KEY = "proximity-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — keep expanded
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside className={cn("flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width]", collapsed ? "w-16" : "w-60")}>
      <div className={cn("flex h-14 items-center gap-2 border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-500 text-[13px] font-bold text-white">P</div>
        {!collapsed && <span className="min-w-0 flex-1 truncate font-semibold text-ink">Proximity</span>}
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggle}
          className={cn("flex size-6 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink", collapsed && "hidden")}
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>

      {collapsed && (
        <button
          aria-label="Expand sidebar"
          onClick={toggle}
          className="mx-auto mt-2 flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink"
        >
          <ChevronsRight className="size-4" />
        </button>
      )}

      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {!collapsed && <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Workspace</p>}
        <ul className="flex flex-col gap-0.5">
          {orgNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    isActive ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-sunken hover:text-ink"
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  {!collapsed && item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {session.isPlatformAdmin && (
          <>
            {!collapsed && <p className="mt-6 px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Platform</p>}
            <ul className={cn("flex flex-col gap-0.5", collapsed && "mt-4")}>
              <li>
                <Link
                  href="/admin"
                  title={collapsed ? "Admin" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    pathname.startsWith("/admin") ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-sunken hover:text-ink"
                  )}
                >
                  <ShieldCheck className="size-4 shrink-0" strokeWidth={2} />
                  {!collapsed && "Admin"}
                </Link>
              </li>
            </ul>
          </>
        )}
      </nav>

      <div className={cn("border-t border-border p-3", collapsed && "flex justify-center p-2")}>
        <div className={cn("flex items-center gap-2.5 rounded-md py-1.5", collapsed ? "px-0" : "px-2")}>
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-semibold text-ink"
            title={collapsed ? `${session.user.fullName} — ${session.role.name}` : undefined}
          >
            {session.user.avatarInitials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{session.user.fullName}</p>
              <p className="truncate text-[11px] text-ink-soft">{session.role.name}</p>
            </div>
          )}
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex size-7 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-critical-text"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
