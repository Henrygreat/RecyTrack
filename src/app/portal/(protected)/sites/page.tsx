import { MapPin, Phone, Mail, Clock, Truck, Star } from "lucide-react";
import { requireCustomerAccess, canAccessSite } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PortalSites() {
  const ctx = await requireCustomerAccess();

  // Fetch sites - respecting site-level access restrictions
  const sites = await prisma.site.findMany({
    where: {
      customerId: ctx.customerId,
      organizationId: ctx.organizationId,
      isActive: true,
      ...(ctx.authorizedSiteIds ? { id: { in: ctx.authorizedSiteIds } } : {}),
    },
    include: {
      zone: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          // This would require siteId on Collection model
          // For now, we'll show site info without collection counts
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Your Sites
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Collection locations registered for {ctx.customerAccess.customer.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites ({sites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No sites available"
              description="Contact your account manager to add collection sites."
            />
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {sites.map((site) => (
                <div
                  key={site.id}
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.5rem",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h3 style={{ fontWeight: "600", fontSize: "1rem", margin: 0 }}>
                          {site.name}
                        </h3>
                        <span
                          className="font-mono text-xs"
                          style={{
                            backgroundColor: "#e2e8f0",
                            padding: "0.125rem 0.375rem",
                            borderRadius: "0.25rem",
                          }}
                        >
                          {site.reference}
                        </span>
                        {site.isDefault && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Star className="w-3 h-3" />
                            Default
                          </span>
                        )}
                      </div>
                      {site.zone && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "0.25rem",
                            fontSize: "0.75rem",
                            color: "#64748b",
                          }}
                        >
                          Zone: {site.zone.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <MapPin className="w-4 h-4 text-slate-400" style={{ marginTop: "0.125rem" }} />
                    <div>
                      <div style={{ fontSize: "0.875rem", color: "#334155" }}>{site.address}</div>
                      <div style={{ fontWeight: "500", fontSize: "0.875rem" }}>{site.postcode}</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(site.contactName || site.contactPhone || site.contactEmail) && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "1rem",
                        marginBottom: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      {site.contactName && (
                        <div style={{ fontSize: "0.875rem" }}>
                          <span style={{ color: "#64748b" }}>Contact: </span>
                          <span style={{ fontWeight: "500" }}>{site.contactName}</span>
                        </div>
                      )}
                      {site.contactPhone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.875rem",
                            color: "#64748b",
                          }}
                        >
                          <Phone className="w-3 h-3" />
                          {site.contactPhone}
                        </div>
                      )}
                      {site.contactEmail && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          <Mail className="w-3 h-3 text-slate-400" />
                          <a
                            href={`mailto:${site.contactEmail}`}
                            style={{ color: "#0f766e", textDecoration: "none" }}
                          >
                            {site.contactEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Info */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    {site.openingHours && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <Clock className="w-4 h-4 text-slate-400" style={{ marginTop: "0.125rem" }} />
                        <div>
                          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>Opening Hours</div>
                          <div style={{ color: "#334155" }}>{site.openingHours}</div>
                        </div>
                      </div>
                    )}
                    {site.vehicleAccessNotes && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <Truck className="w-4 h-4 text-slate-400" style={{ marginTop: "0.125rem" }} />
                        <div>
                          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>Vehicle Access</div>
                          <div style={{ color: "#334155" }}>{site.vehicleAccessNotes}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collection Instructions */}
                  {site.collectionInstructions && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        backgroundColor: "#f0fdfa",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ fontWeight: "500", color: "#0f766e", marginBottom: "0.25rem" }}>
                        Collection Instructions
                      </div>
                      <div style={{ color: "#334155" }}>{site.collectionInstructions}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
