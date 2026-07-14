"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS, SERVICE_PRICING_MODEL_LABELS } from "@/lib/marketplace-labels";
import type { ProjectServiceIntegration, ServiceCategory, ServiceListing } from "@/types";

function ListingCard({
  listing,
  isActive,
  canManage,
  onToggle,
  busy,
}: {
  listing: ServiceListing;
  isActive: boolean;
  canManage: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  const Icon = SERVICE_CATEGORY_ICONS[listing.category];
  return (
    <Card className="flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-soft">
            <Icon className="size-4.5" strokeWidth={1.75} />
          </div>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-good-bg px-2 py-0.5 text-[11px] font-medium text-good-text">
              <Check className="size-3" /> Active
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold leading-snug text-ink">{listing.name}</h3>
          <p className="mt-0.5 text-[12px] text-ink-soft">{listing.provider}</p>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{listing.description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {listing.apiAvailable && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">API</span>
          )}
          {listing.badges.map((badge) => (
            <span key={badge} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-soft">
              {badge}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[13px] font-medium text-ink">{listing.priceLabel}</p>
            <p className="text-[11px] text-ink-soft">{SERVICE_PRICING_MODEL_LABELS[listing.pricingModel]}</p>
          </div>
          {canManage && (
            <Button variant={isActive ? "secondary" : "primary"} size="sm" onClick={onToggle} disabled={busy}>
              {busy ? "…" : isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function MarketplaceClient({ listings }: { listings: ServiceListing[] }) {
  const { session } = useSession();
  const { projects } = useStudio();
  const canManage = canEditStudio(session.role.tier);
  const orgProjects = useMemo(() => projects.filter((p) => p.organizationId === session.organization.id), [projects, session.organization.id]);

  const [selectedProjectId, setSelectedProjectId] = useState(orgProjects[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "all">("all");
  const [integrations, setIntegrations] = useState<ProjectServiceIntegration[] | null>(null);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setIntegrations([]);
      return;
    }
    let cancelled = false;
    setIntegrations(null);
    fetch(`/api/projects/${selectedProjectId}/service-integrations`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data: ProjectServiceIntegration[]) => {
        if (!cancelled) setIntegrations(data);
      })
      .catch((err) => {
        console.error("Failed to load service integrations", err);
        if (!cancelled) setIntegrations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const activeListingIds = useMemo(
    () => new Set((integrations ?? []).filter((i) => i.status === "active").map((i) => i.serviceListingId)),
    [integrations]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<ServiceCategory, number>();
    for (const listing of listings) counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
    return counts;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((listing) => {
      if (activeCategory !== "all" && listing.category !== activeCategory) return false;
      if (!query) return true;
      return listing.name.toLowerCase().includes(query) || listing.provider.toLowerCase().includes(query) || SERVICE_CATEGORY_LABELS[listing.category].toLowerCase().includes(query);
    });
  }, [listings, activeCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<ServiceCategory, ServiceListing[]>();
    for (const listing of filteredListings) map.set(listing.category, [...(map.get(listing.category) ?? []), listing]);
    return map;
  }, [filteredListings]);

  async function toggle(listing: ServiceListing) {
    if (!selectedProjectId) return;
    setBusyListingId(listing.id);
    setError(null);
    try {
      const existing = (integrations ?? []).find((i) => i.serviceListingId === listing.id);
      if (existing && existing.status === "active") {
        const res = await fetch(`/api/projects/${selectedProjectId}/service-integrations/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "disconnected" }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to deactivate");
        const updated: ProjectServiceIntegration = await res.json();
        setIntegrations((prev) => (prev ?? []).map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const res = await fetch(`/api/projects/${selectedProjectId}/service-integrations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceListingId: listing.id }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to activate");
        const created: ProjectServiceIntegration = await res.json();
        setIntegrations((prev) => {
          const rest = (prev ?? []).filter((i) => i.serviceListingId !== listing.id);
          return [...rest, created];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyListingId(null);
    }
  }

  if (orgProjects.length === 0) {
    return <EmptyState title="No projects yet" description="Create a project first — Marketplace integrations belong to one." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
        >
          {orgProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find services or providers…"
            className="w-full rounded-md border border-border-strong bg-surface py-1.5 pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-soft/60"
          />
        </div>
      </div>

      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px]",
              activeCategory === "all" ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-sunken"
            )}
          >
            All categories <span className="tabular ml-2 text-[11.5px]">{listings.length}</span>
          </button>
          {(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px]",
                activeCategory === category ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-sunken"
              )}
            >
              <span className="truncate">{SERVICE_CATEGORY_LABELS[category]}</span>
              <span className="tabular shrink-0 text-[11.5px]">{categoryCounts.get(category) ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          {integrations === null ? (
            <p className="text-[13px] text-ink-soft">Loading…</p>
          ) : filteredListings.length === 0 ? (
            <EmptyState title="No services match" description="Try a different search term or category." />
          ) : activeCategory !== "all" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isActive={activeListingIds.has(listing.id)}
                  canManage={canManage}
                  busy={busyListingId === listing.id}
                  onToggle={() => toggle(listing)}
                />
              ))}
            </div>
          ) : (
            [...grouped.entries()].map(([category, categoryListings]) => (
              <div key={category}>
                <h2 className="mb-2.5 text-[13px] font-semibold text-ink">{SERVICE_CATEGORY_LABELS[category]}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {categoryListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isActive={activeListingIds.has(listing.id)}
                      canManage={canManage}
                      busy={busyListingId === listing.id}
                      onToggle={() => toggle(listing)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
