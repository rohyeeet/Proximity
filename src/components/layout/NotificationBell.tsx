"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch((error) => console.error("Failed to load notifications", error));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function markRead(notification: Notification) {
    if (notification.readAt) return;
    await fetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-sunken"
      >
        <Bell className="size-4" strokeWidth={2} />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical-text" />}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[12px] font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-soft">No notifications yet.</p>}
            {notifications.map((notification) => {
              const content = (
                <div className={cn("flex flex-col gap-0.5 border-b border-border px-3 py-2.5 last:border-0", !notification.readAt && "bg-brand-50/50")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-ink">{notification.title}</p>
                    {!notification.readAt && <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                  <p className="text-[12.5px] text-ink-soft">{notification.body}</p>
                  <p className="text-[11px] text-ink-soft/70">{formatRelativeTime(notification.createdAt)}</p>
                </div>
              );
              const href = notification.linkUrl ?? (notification.formTemplateId ? `/forms/${notification.formTemplateId}` : undefined);
              return href ? (
                <Link key={notification.id} href={href} onClick={() => markRead(notification)}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id} onClick={() => markRead(notification)} className="cursor-pointer">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
