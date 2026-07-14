import { NextResponse } from "next/server";
import { getServiceListings } from "@/lib/queries";

/** The Marketplace's catalog — open to any authenticated request, same as a DomainPack; it's
 * curated seed data, not org-sensitive. What a project has actually connected is a separate,
 * access-gated read (see /api/projects/[id]/service-integrations). */
export async function GET() {
  const listings = await getServiceListings();
  return NextResponse.json(listings);
}
