import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Building,
  MapPin,
  Calendar,
  Clock,
  Package,
  User,
  Phone,
  Mail,
  Truck,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CollectionStatusBadge, PriorityBadge } from "@/components/ui/badge";
import { STATUS_LABELS, COLLECTION_TYPE_LABELS, getAvailableTransitions } from "@/lib/collections";
import { CollectionActions } from "../components/collection-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetail({ params }: PageProps) {
  const { id } = await params;
  const { organizationId, membership } = await requireMember();

  const collection = await prisma.collection.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      site: true,
      routeDate: { include: { zone: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      assets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  const canManage = MANAGEMENT_ROLES.includes(membership.role);
  const availableTransitions = getAvailableTransitions(collection.status);

  // Get drivers for assignment
  const drivers = canManage
    ? await prisma.membership.findMany({
        where: { organizationId, role: "DRIVER" },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    : [];

  return (
    <>
      <Link
        href="/dashboard/collections"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#0f172a",
                margin: 0,
                fontFamily: "monospace",
              }}
            >
              {collection.reference}
            </h1>
            <CollectionStatusBadge status={collection.status} />
            <PriorityBadge priority={collection.priority} />
          </div>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            {COLLECTION_TYPE_LABELS[collection.collectionType]} • Created{" "}
            {collection.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {canManage && availableTransitions.length > 0 && (
          <CollectionActions
            collectionId={collection.id}
            currentStatus={collection.status}
            availableTransitions={availableTransitions}
            drivers={drivers.map((d) => ({
              id: d.user.id,
              name: d.user.name || d.user.email,
            }))}
          />
        )}
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "2fr 1fr" }}>
        {/* Main Content */}
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {/* Customer & Location */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building className="w-4 h-4 text-teal-600" />
                Customer & Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>Customer</div>
                  <Link
                    href={`/dashboard/customers/${collection.customerId}`}
                    style={{ fontWeight: "500", color: "#0f172a", textDecoration: "none" }}
                  >
                    {collection.customer.name}
                  </Link>
                  <span style={{ color: "#64748b", marginLeft: "0.5rem" }}>({collection.customer.reference})</span>
                </div>

                {collection.site && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>Site</div>
                    <div style={{ fontWeight: "500" }}>
                      {collection.site.name}
                      <span style={{ color: "#64748b", marginLeft: "0.5rem" }}>({collection.site.reference})</span>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                    <MapPin className="w-3 h-3" style={{ display: "inline", marginRight: "0.25rem" }} />
                    Collection Address
                  </div>
                  <div>{collection.address}</div>
                  <div style={{ fontWeight: "500" }}>{collection.postcode}</div>
                </div>

                {(collection.contactName || collection.contactPhone || collection.contactEmail) && (
                  <div
                    style={{
                      paddingTop: "1rem",
                      borderTop: "1px solid #e2e8f0",
                      display: "grid",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Site Contact</div>
                    {collection.contactName && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <User className="w-4 h-4 text-slate-400" />
                        {collection.contactName}
                      </div>
                    )}
                    {collection.contactPhone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${collection.contactPhone}`} style={{ color: "#0f766e" }}>
                          {collection.contactPhone}
                        </a>
                      </div>
                    )}
                    {collection.contactEmail && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${collection.contactEmail}`} style={{ color: "#0f766e" }}>
                          {collection.contactEmail}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Package className="w-4 h-4 text-teal-600" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "2rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Estimated</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "600", fontFamily: "monospace" }}>
                      {collection.itemEstimate}
                    </div>
                  </div>
                  {collection.actualItemCount !== null && (
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Actual</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "600", fontFamily: "monospace" }}>
                        {collection.actualItemCount}
                      </div>
                    </div>
                  )}
                </div>

                {collection.equipmentCategories.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>Categories</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {collection.equipmentCategories.map((cat) => (
                        <span
                          key={cat}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          {(collection.specialHandling || collection.customerInstructions || collection.internalNotes) && (
            <Card>
              <CardHeader>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText className="w-4 h-4 text-teal-600" />
                  Instructions & Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {collection.specialHandling && (
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#fef3c7",
                        borderRadius: "0.375rem",
                        borderLeft: "4px solid #f59e0b",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontWeight: "500",
                          color: "#b45309",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Special Handling
                      </div>
                      <div style={{ color: "#92400e" }}>{collection.specialHandling}</div>
                    </div>
                  )}

                  {collection.customerInstructions && (
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                        Customer Instructions
                      </div>
                      <div style={{ color: "#334155" }}>{collection.customerInstructions}</div>
                    </div>
                  )}

                  {collection.internalNotes && (
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "0.375rem",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                        Internal Notes
                      </div>
                      <div style={{ color: "#334155" }}>{collection.internalNotes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          {collection.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock className="w-4 h-4 text-teal-600" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {collection.statusHistory.map((change) => (
                    <div
                      key={change.id}
                      style={{
                        display: "flex",
                        gap: "1rem",
                        padding: "0.75rem",
                        backgroundColor: "#f8fafc",
                        borderRadius: "0.375rem",
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {change.toStatus === "CANCELLED" || change.toStatus === "EXCEPTION" ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-teal-600" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: "500" }}>
                            {change.fromStatus ? `${STATUS_LABELS[change.fromStatus]} → ` : ""}
                            {STATUS_LABELS[change.toStatus]}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {change.createdAt.toLocaleString("en-GB")}
                          </span>
                        </div>
                        {change.changedByName && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>by {change.changedByName}</div>
                        )}
                        {change.reason && <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>{change.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "grid", gap: "1.5rem", alignContent: "start" }}>
          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar className="w-4 h-4 text-teal-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {collection.scheduledDate && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Scheduled Date</div>
                    <div style={{ fontWeight: "500" }}>
                      {collection.scheduledDate.toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}

                {collection.requestedDate && !collection.scheduledDate && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Requested Date</div>
                    <div style={{ fontWeight: "500" }}>
                      {collection.requestedDate.toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}

                {collection.routeDate && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Route</div>
                    <div style={{ fontWeight: "500" }}>{collection.routeDate.zone.name}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Truck className="w-4 h-4 text-teal-600" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {collection.driverName || collection.vehicleReg ? (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {collection.driverName && (
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Driver</div>
                      <div style={{ fontWeight: "500" }}>{collection.driverName}</div>
                    </div>
                  )}
                  {collection.vehicleReg && (
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Vehicle</div>
                      <div style={{ fontWeight: "500", fontFamily: "monospace" }}>{collection.vehicleReg}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Not yet assigned</div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock className="w-4 h-4 text-teal-600" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Created</span>
                  <span>{collection.createdAt.toLocaleString("en-GB")}</span>
                </div>
                {collection.approvedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Approved</span>
                    <span>{collection.approvedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
                {collection.assignedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Assigned</span>
                    <span>{collection.assignedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
                {collection.dispatchedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Dispatched</span>
                    <span>{collection.dispatchedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
                {collection.collectedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Collected</span>
                    <span>{collection.collectedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
                {collection.receivedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Received</span>
                    <span>{collection.receivedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
                {collection.completedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Completed</span>
                    <span>{collection.completedAt.toLocaleString("en-GB")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
