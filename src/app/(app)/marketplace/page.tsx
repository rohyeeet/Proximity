import { getServiceListings } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { MarketplaceClient } from "@/components/marketplace/MarketplaceClient";

export default async function MarketplacePage() {
  const listings = await getServiceListings();

  return (
    <div>
      <PageHeader
        eyebrow="Science & Data"
        title="Marketplace"
        description="Connect the measurement, lab, and verification services your methodology actually needs — soil carbon modeling, remote sensing, lab analysis, LCA, registry APIs — scoped per project, each at a listed cost. Distinct from Connectors' raw device telemetry: this is professional services and data procurement. Activation here is informational for this prototype — no real API call or billing happens yet."
      />
      <MarketplaceClient listings={listings} />
    </div>
  );
}
