"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ClipboardList, History, LogOut, Wallet } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/collect", label: "Forms", icon: ClipboardList },
  { href: "/collect/submissions", label: "My submissions", icon: History },
  { href: "/collect/payments", label: "Payments", icon: Wallet },
];

/**
 * Deliberately NOT the Studio shell — no Sidebar, no desktop nav, no org switcher. A narrow,
 * centered column with a two-tab bottom bar, styled to read as a simple mobile app regardless of
 * the actual device, matching the ODK-Collect-style "just my assigned work" experience.
 */
export function CollectShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col bg-sunken">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-500 text-[13px] font-bold text-white">P</div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-ink">{session.organization.name}</p>
            <p className="truncate text-[11px] leading-tight text-ink-soft">{session.user.fullName}</p>
          </div>
        </div>
        <button
          aria-label="Sign out"
          title="Sign out"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-sunken hover:text-critical-text"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="mx-auto w-full min-h-0 max-w-[480px] flex-1 overflow-y-auto px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[480px]">
          {tabs.map((tab) => {
            const active = tab.href === "/collect" ? pathname === "/collect" : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-600" : "text-ink-soft"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
