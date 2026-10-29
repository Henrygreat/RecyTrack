"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Building,
  MapPinned,
  Users,
  Truck,
  FileText,
  Activity,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Plus,
  Globe,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCw,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resendInvitation, revokeInvitation, removeCustomerAccess } from "../../actions";
import type { Customer, Site, CustomerContact, Collection, CustomerAccess, CustomerInvitation, AuditLog, User } from "@prisma/client";

interface CustomerTabsProps {
  customerId: string;
  activeTab: string;
  customer: Customer & {
    sites: Site[];
    contacts: CustomerContact[];
    collections: Collection[];
    invitations: CustomerInvitation[];
    customerAccess: (CustomerAccess & { user: Pick<User, "id" | "name" | "email"> })[];
  };
  canManage: boolean;
  recentActivity: AuditLog[];
}

const tabs = [
  { id: "overview", label: "Overview", icon: Building },
  { id: "sites", label: "Sites", icon: MapPinned },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "collections", label: "Collections", icon: Truck },
  { id: "access", label: "User Access", icon: UserPlus },
  { id: "activity", label: "Activity", icon: Activity },
];

export function CustomerTabs({
  customerId,
  activeTab,
  customer,
  canManage,
  recentActivity,
}: CustomerTabsProps) {
  return (
    <>
      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/dashboard/customers/${customerId}?tab=${tab.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: isActive ? "500" : "400",
                color: isActive ? "#0f766e" : "#64748b",
                borderBottom: isActive ? "2px solid #0f766e" : "2px solid transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
                marginBottom: "-1px",
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab customer={customer} />
      )}
      {activeTab === "sites" && (
        <SitesTab customerId={customerId} sites={customer.sites} canManage={canManage} />
      )}
      {activeTab === "contacts" && (
        <ContactsTab customerId={customerId} contacts={customer.contacts} canManage={canManage} />
      )}
      {activeTab === "collections" && (
        <CollectionsTab customerId={customerId} collections={customer.collections} />
      )}
      {activeTab === "access" && (
        <AccessTab
          customerId={customerId}
          customerAccess={customer.customerAccess}
          invitations={customer.invitations}
          canManage={canManage}
        />
      )}
      {activeTab === "activity" && (
        <ActivityTab activity={recentActivity} />
      )}
    </>
  );
}

function OverviewTab({ customer }: { customer: CustomerTabsProps["customer"] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl style={{ display: "grid", gap: "0.75rem" }}>
            {customer.contactName && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Primary Contact</dt>
                <dd style={{ fontWeight: "500" }}>{customer.contactName}</dd>
              </div>
            )}
            {customer.email && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Email</dt>
                <dd>
                  <a href={`mailto:${customer.email}`} className="text-teal-600 hover:text-teal-700">
                    {customer.email}
                  </a>
                </dd>
              </div>
            )}
            {customer.phone && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
            )}
            {customer.website && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Website</dt>
                <dd>
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700">
                    {customer.website}
                  </a>
                </dd>
              </div>
            )}
            {!customer.email && !customer.phone && !customer.website && (
              <p className="text-slate-400">No contact information provided</p>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Customer Type</dt>
              <dd style={{ fontWeight: "500" }}>
                {customer.customerType === "BUSINESS" ? "Business" : "Individual"}
              </dd>
            </div>
            {customer.companyNumber && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Company Number</dt>
                <dd>{customer.companyNumber}</dd>
              </div>
            )}
            {customer.vatNumber && (
              <div>
                <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>VAT Number</dt>
                <dd>{customer.vatNumber}</dd>
              </div>
            )}
            <div>
              <dt style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.125rem" }}>Customer Since</dt>
              <dd>{customer.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.address || customer.postcode ? (
            <address style={{ fontStyle: "normal" }}>
              {customer.address && <div style={{ whiteSpace: "pre-line" }}>{customer.address}</div>}
              {customer.postcode && <div style={{ fontWeight: "500", marginTop: "0.25rem" }}>{customer.postcode}</div>}
            </address>
          ) : (
            <p className="text-slate-400">No billing address provided</p>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ whiteSpace: "pre-line", color: "#475569" }}>{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SitesTab({ customerId, sites, canManage }: { customerId: string; sites: Site[]; canManage: boolean }) {
  return (
    <Card>
      <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Sites ({sites.length})</CardTitle>
        {canManage && (
          <Link href={`/dashboard/customers/${customerId}/sites/new`} className="btn" style={{ fontSize: "0.875rem" }}>
            <Plus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Add Site
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            title="No sites yet"
            description="Add collection sites for this customer."
            action={canManage ? { label: "Add Site", href: `/dashboard/customers/${customerId}/sites/new` } : undefined}
          />
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {sites.map((site) => (
              <div
                key={site.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  opacity: site.isActive ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "600" }}>{site.name}</span>
                      <span className="font-mono text-xs" style={{ backgroundColor: "#f1f5f9", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>
                        {site.reference}
                      </span>
                      {site.isDefault && (
                        <span className="badge" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>Default</span>
                      )}
                      {!site.isActive && (
                        <span className="badge" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>Inactive</span>
                      )}
                    </div>
                    <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                      {site.address}, {site.postcode}
                    </p>
                    {site.contactName && (
                      <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Contact: {site.contactName} {site.contactPhone && `• ${site.contactPhone}`}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Link
                      href={`/dashboard/customers/${customerId}/sites/${site.id}/edit`}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContactsTab({ customerId, contacts, canManage }: { customerId: string; contacts: CustomerContact[]; canManage: boolean }) {
  return (
    <Card>
      <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Contacts ({contacts.length})</CardTitle>
        {canManage && (
          <Link href={`/dashboard/customers/${customerId}/contacts/new`} className="btn" style={{ fontSize: "0.875rem" }}>
            <Plus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
            Add Contact
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add contacts for this customer."
            action={canManage ? { label: "Add Contact", href: `/dashboard/customers/${customerId}/contacts/new` } : undefined}
          />
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "500" }}>{contact.name}</span>
                    {contact.isPrimary && <span className="badge" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Primary</span>}
                    {contact.isBilling && <span className="badge" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>Billing</span>}
                    {contact.isOperational && <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>Ops</span>}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem", fontSize: "0.875rem", color: "#64748b" }}>
                    {contact.jobTitle && <span>{contact.jobTitle}</span>}
                    {contact.email && (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Link
                    href={`/dashboard/customers/${customerId}/contacts/${contact.id}/edit`}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                  >
                    Edit
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionsTab({ customerId, collections }: { customerId: string; collections: Collection[] }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    REQUESTED: { bg: "#fef3c7", text: "#b45309" },
    CONFIRMED: { bg: "#dbeafe", text: "#1e40af" },
    ASSIGNED: { bg: "#e0e7ff", text: "#4338ca" },
    IN_TRANSIT: { bg: "#fae8ff", text: "#a21caf" },
    COLLECTED: { bg: "#d1fae5", text: "#065f46" },
    RECEIVED: { bg: "#dcfce7", text: "#166534" },
    CANCELLED: { bg: "#fef2f2", text: "#b91c1c" },
  };

  return (
    <Card>
      <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Recent Collections</CardTitle>
        <Link href={`/dashboard/collections?customerId=${customerId}`} className="text-sm text-teal-600 hover:text-teal-700">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No collections yet"
            description="This customer has no collection records."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => {
                  const colors = statusColors[collection.status] || { bg: "#f1f5f9", text: "#64748b" };
                  return (
                    <tr key={collection.id}>
                      <td>
                        <Link href={`/dashboard/collections/${collection.id}`} className="font-mono text-teal-600 hover:text-teal-700">
                          {collection.reference}
                        </Link>
                      </td>
                      <td className="text-slate-600">
                        {collection.createdAt.toLocaleDateString("en-GB")}
                      </td>
                      <td className="text-slate-600">{collection.postcode}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {collection.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccessTab({
  customerId,
  customerAccess,
  invitations,
  canManage,
}: {
  customerId: string;
  customerAccess: CustomerTabsProps["customer"]["customerAccess"];
  invitations: CustomerInvitation[];
  canManage: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Current Users */}
      <Card>
        <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Portal Users ({customerAccess.length})</CardTitle>
          {canManage && (
            <Link href={`/dashboard/customers/${customerId}/invite`} className="btn" style={{ fontSize: "0.875rem" }}>
              <UserPlus className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
              Invite User
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {customerAccess.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No portal users"
              description="Invite users to give them access to the customer portal."
              action={canManage ? { label: "Invite User", href: `/dashboard/customers/${customerId}/invite` } : undefined}
            />
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {customerAccess.map((access) => (
                <div
                  key={access.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "500" }}>{access.user.name || access.user.email}</div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{access.user.email}</div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: access.role === "CUSTOMER_ADMIN" ? "#dbeafe" : "#f1f5f9",
                      color: access.role === "CUSTOMER_ADMIN" ? "#1e40af" : "#64748b",
                    }}
                  >
                    {access.role === "CUSTOMER_ADMIN" ? "Admin" : "User"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  canManage={canManage}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvitationRow({
  invitation,
  canManage
}: {
  invitation: CustomerInvitation;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendInvitation(invitation.id);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  const handleRevoke = () => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (result.error) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  // Determine email status
  const emailSent = !!invitation.emailSentAt;
  const emailFailed = !!invitation.emailFailedAt;
  const resendCount = invitation.resendCount || 0;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.75rem 1rem",
        border: emailFailed ? "1px solid #fecaca" : emailSent ? "1px solid #bbf7d0" : "1px solid #fef3c7",
        backgroundColor: emailFailed ? "#fef2f2" : emailSent ? "#f0fdf4" : "#fffbeb",
        borderRadius: "0.5rem",
      }}
    >
      <div>
        <div style={{ fontWeight: "500" }}>{invitation.email}</div>
        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
          Expires: {new Date(invitation.expiresAt).toLocaleDateString("en-GB")}
          {resendCount > 0 && ` • Resent ${resendCount} time${resendCount > 1 ? "s" : ""}`}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Email Status Badge */}
        {emailFailed ? (
          <span
            className="badge"
            style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
            title={invitation.emailFailureReason || "Email delivery failed"}
          >
            <XCircle className="w-3 h-3" style={{ marginRight: "0.25rem" }} />
            Failed
          </span>
        ) : emailSent ? (
          <span className="badge" style={{ backgroundColor: "#d1fae5", color: "#059669" }}>
            <CheckCircle className="w-3 h-3" style={{ marginRight: "0.25rem" }} />
            Sent
          </span>
        ) : (
          <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
            <AlertCircle className="w-3 h-3" style={{ marginRight: "0.25rem" }} />
            Not sent
          </span>
        )}

        {/* Actions */}
        {canManage && (
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={handleResend}
              disabled={isPending}
              title="Resend invitation email"
              style={{
                padding: "0.375rem",
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: "0.25rem",
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Send className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <button
              onClick={handleRevoke}
              disabled={isPending}
              title="Revoke invitation"
              style={{
                padding: "0.375rem",
                background: "none",
                border: "1px solid #fecaca",
                borderRadius: "0.25rem",
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: AuditLog[] }) {
  const actionLabels: Record<string, string> = {
    CUSTOMER_CREATED: "Customer created",
    CUSTOMER_UPDATED: "Customer updated",
    CUSTOMER_ARCHIVED: "Customer archived",
    CUSTOMER_REACTIVATED: "Customer reactivated",
    SITE_CREATED: "Site added",
    SITE_UPDATED: "Site updated",
    SITE_ACTIVATED: "Site activated",
    SITE_DEACTIVATED: "Site deactivated",
    CONTACT_CREATED: "Contact added",
    CONTACT_UPDATED: "Contact updated",
    COLLECTION_CREATED: "Collection booked",
    COLLECTION_STATUS_UPDATED: "Collection status changed",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Activity related to this customer will appear here."
          />
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {activity.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    backgroundColor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Activity className="w-4 h-4 text-slate-500" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "500", fontSize: "0.875rem" }}>
                    {actionLabels[log.action] || log.action}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {log.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
