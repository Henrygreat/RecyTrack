"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Clock,
  Truck,
  Star,
  Edit,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getPortalSiteDetail,
  setDefaultSite,
  toggleSiteStatus,
} from "../../actions";
import type { CollectionStatus } from "@prisma/client";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: "bg-amber-100", text: "text-amber-700", label: "Requested" },
  APPROVED: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
  SCHEDULED: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Scheduled" },
  IN_TRANSIT: { bg: "bg-teal-100", text: "text-teal-700", label: "In Transit" },
  COLLECTED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Collected" },
  RECEIVED: { bg: "bg-green-100", text: "text-green-700", label: "Received" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

type SiteData = {
  id: string;
  reference: string;
  name: string;
  address: string;
  postcode: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  collectionInstructions: string | null;
  openingHours: string | null;
  vehicleAccessNotes: string | null;
  isActive: boolean;
  isDefault: boolean;
  zone: { id: string; name: string } | null;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    isPrimary: boolean;
  }>;
};

type CollectionData = {
  id: string;
  reference: string;
  status: CollectionStatus;
  scheduledDate: Date | null;
  collectedAt: Date | null;
  _count: { assets: number };
};

export default function PortalSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [site, setSite] = useState<SiteData | null>(null);
  const [canManageSite, setCanManageSite] = useState(false);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [collectionStats, setCollectionStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadSite() {
      setLoading(true);
      const result = await getPortalSiteDetail(id);
      if (result.success && result.site) {
        setSite(result.site as SiteData);
        setCanManageSite(Boolean(result.canManageSite));
        setCollections(result.recentCollections as CollectionData[]);
        setCollectionStats(result.collectionStats || {});
      } else {
        setError(result.error || "Failed to load site");
      }
      setLoading(false);
    }
    loadSite();
  }, [id]);

  const handleSetDefault = async () => {
    setActionLoading("default");
    const result = await setDefaultSite(id);
    if (result.success) {
      setSite((s) => (s ? { ...s, isDefault: true } : null));
      router.refresh();
    } else {
      alert(result.error);
    }
    setActionLoading(null);
  };

  const handleToggleStatus = async () => {
    setActionLoading("status");
    const result = await toggleSiteStatus(id);
    if (result.success && "isActive" in result) {
      setSite((s) => (s ? { ...s, isActive: result.isActive } : null));
      router.refresh();
    } else {
      alert(result.error);
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="space-y-6">
        <Link
          href="/portal/sites"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sites
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Site Not Found</h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCollections = Object.values(collectionStats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/portal/sites"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sites
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100">
              <MapPin className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
                <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {site.reference}
                </span>
                {site.isDefault && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    <Star className="h-3 w-3" />
                    Primary
                  </span>
                )}
                {!site.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-slate-500">{site.address}, {site.postcode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManageSite && !site.isDefault && site.isActive && (
              <button
                onClick={handleSetDefault}
                disabled={actionLoading === "default"}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {actionLoading === "default" ? "Setting..." : "Set as primary"}
              </button>
            )}
            {canManageSite && (
              <>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={actionLoading === "status"}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {actionLoading === "status" ? "Saving..." : site.isActive ? "Deactivate" : "Activate"}
                </button>
                <Link
                  href={`/portal/sites/${id}/edit`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit Site
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalCollections}</p>
                <p className="text-sm text-slate-500">Total Collections</p>
              </div>
              <Truck className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {collectionStats["COMPLETED"] || 0}
                </p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {(collectionStats["SCHEDULED"] || 0) + (collectionStats["APPROVED"] || 0)}
                </p>
                <p className="text-sm text-slate-500">Scheduled</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {collectionStats["REQUESTED"] || 0}
                </p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Site Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Site Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Address</dt>
                <dd className="text-slate-900">{site.address}</dd>
                <dd className="font-medium text-slate-900">{site.postcode}</dd>
              </div>
              {site.zone && (
                <div>
                  <dt className="text-sm text-slate-500">Service Zone</dt>
                  <dd className="text-slate-900">{site.zone.name}</dd>
                </div>
              )}
              {site.openingHours && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-slate-500">Opening Hours</dt>
                    <dd className="text-slate-900">{site.openingHours}</dd>
                  </div>
                </div>
              )}
              {site.vehicleAccessNotes && (
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <dt className="text-sm text-slate-500">Vehicle Access</dt>
                    <dd className="text-slate-900">{site.vehicleAccessNotes}</dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {site.contactName || site.contactPhone || site.contactEmail ? (
              <div className="space-y-3">
                {site.contactName && (
                  <div>
                    <dt className="text-sm text-slate-500">Primary Contact</dt>
                    <dd className="font-medium text-slate-900">{site.contactName}</dd>
                  </div>
                )}
                {site.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${site.contactPhone}`} className="text-teal-600 hover:text-teal-700">
                      {site.contactPhone}
                    </a>
                  </div>
                )}
                {site.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${site.contactEmail}`} className="text-teal-600 hover:text-teal-700">
                      {site.contactEmail}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No contact information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collection Instructions */}
      {site.collectionInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Collection Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 bg-teal-50 p-4 rounded-lg border border-teal-100">
              {site.collectionInstructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Collections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Recent Collections
          </CardTitle>
          <Link
            href={`/portal/book?siteId=${id}`}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Book Collection
          </Link>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No collections from this site yet</p>
              <Link
                href={`/portal/book?siteId=${id}`}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                Book a Collection
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => {
                const colors = statusColors[collection.status] || {
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  label: collection.status,
                };
                return (
                  <Link
                    key={collection.id}
                    href={`/portal/collections/${collection.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {collection.reference}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        {colors.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {collection._count.assets} assets
                      </span>
                      {collection.scheduledDate && (
                        <span>
                          {new Date(collection.scheduledDate).toLocaleDateString("en-GB")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
