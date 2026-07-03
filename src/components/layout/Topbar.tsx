import { OrgSwitcher } from "./OrgSwitcher";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <OrgSwitcher />
      <NotificationBell />
    </header>
  );
}
