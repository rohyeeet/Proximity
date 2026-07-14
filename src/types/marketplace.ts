/** The dMRV "Science" side of the platform — a curated, global catalog of real-world scientific/
 * verification services (soil carbon modeling, remote sensing, lab analysis, LCA, ...) a project
 * can connect for a listed cost, distinct from Connectors (raw device/IoT telemetry ingestion). */
export type ServiceCategory =
  | "soil_carbon_modeling"
  | "remote_sensing"
  | "erw_geochemical"
  | "lab_analysis"
  | "lca"
  | "ghg_flux_monitoring"
  | "registry_api";

export type ServicePricingModel = "per_sample" | "per_hectare_month" | "subscription_month" | "per_api_call" | "custom_quote";

export interface ServiceListing {
  id: string;
  category: ServiceCategory;
  name: string;
  provider: string;
  description: string;
  pricingModel: ServicePricingModel;
  priceLabel: string;
  apiAvailable: boolean;
  badges: string[];
  website?: string;
  order: number;
}

export type ServiceIntegrationStatus = "active" | "disconnected";

/** Which project has connected which listing — the only mutable, project-scoped state in the
 * Marketplace. Activation is deliberately simulated (see README's Prototype boundaries): no real
 * API call or billing happens, this just records the project's own intent/config. */
export interface ProjectServiceIntegration {
  id: string;
  projectId: string;
  serviceListingId: string;
  status: ServiceIntegrationStatus;
  requestedByUserId: string;
  activatedAt: string;
}
