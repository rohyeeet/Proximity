import { Sprout, Satellite, FlaskConical, Microscope, Recycle, Wind, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ServiceCategory, ServicePricingModel } from "@/types";

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  soil_carbon_modeling: "Soil Carbon Modeling",
  remote_sensing: "Remote Sensing & Biomass Monitoring",
  erw_geochemical: "Enhanced Weathering & Geochemical Analysis",
  lab_analysis: "Lab Analysis & Material Testing",
  lca: "Life Cycle Assessment",
  ghg_flux_monitoring: "GHG Flux & Emissions Monitoring",
  registry_api: "Registry & Certification APIs",
};

export const SERVICE_CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  soil_carbon_modeling: Sprout,
  remote_sensing: Satellite,
  erw_geochemical: FlaskConical,
  lab_analysis: Microscope,
  lca: Recycle,
  ghg_flux_monitoring: Wind,
  registry_api: ShieldCheck,
};

export const SERVICE_PRICING_MODEL_LABELS: Record<ServicePricingModel, string> = {
  per_sample: "per sample",
  per_hectare_month: "per hectare / month",
  subscription_month: "per month",
  per_api_call: "per API call",
  custom_quote: "custom quote",
};
