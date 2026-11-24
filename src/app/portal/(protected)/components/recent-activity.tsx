"use client";

import Link from "next/link";
import { Award, Truck, ArrowRight, Package } from "lucide-react";
import type { CertificateType, CollectionStatus } from "@prisma/client";

// Collection status colors
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  REQUESTED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  APPROVED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  SCHEDULED: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  IN_TRANSIT: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  COLLECTED: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  RECEIVED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  EXCEPTION: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

interface RecentCertificate {
  id: string;
  certificateNumber: string;
  certificateType: CertificateType;
  issueDate: Date | null;
  totalMediaCount: number | null;
}

interface RecentCertificatesProps {
  certificates: RecentCertificate[];
}

export function RecentCertificates({ certificates }: RecentCertificatesProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-bento overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-teal" />
          <h3 className="font-semibold text-midnight-navy">Recent Certificates</h3>
        </div>
        <Link
          href="/portal/certificates"
          className="text-sm text-primary-teal hover:text-primary-teal/80 font-medium flex items-center gap-1 group"
        >
          View all
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {certificates.length === 0 ? (
          <div className="py-12 text-center">
            <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-muted-text">No certificates issued yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Certificates will appear here after processing
            </p>
          </div>
        ) : (
          certificates.map((cert) => (
            <Link
              key={cert.id}
              href={`/portal/certificates/${cert.id}`}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-medium text-midnight-navy truncate">
                  {cert.certificateNumber}
                </p>
                <p className="text-xs text-muted-text mt-0.5">
                  {cert.certificateType.replace(/_/g, " ")}
                  {cert.totalMediaCount && ` - ${cert.totalMediaCount} items`}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-xs text-muted-text">
                  {cert.issueDate
                    ? new Date(cert.issueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })
                    : "-"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

interface RecentCollection {
  id: string;
  reference: string;
  status: CollectionStatus;
  scheduledDate: Date | null;
  _count: { assets: number };
  statusHistory: { id: string; toStatus: CollectionStatus; createdAt: Date }[];
}

interface RecentCollectionsProps {
  collections: RecentCollection[];
}

export function RecentCollections({ collections }: RecentCollectionsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-bento overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-midnight-navy">Recent Collections</h3>
        </div>
        <Link
          href="/portal/collections"
          className="text-sm text-primary-teal hover:text-primary-teal/80 font-medium flex items-center gap-1 group"
        >
          View all
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {collections.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-muted-text">No collections yet</p>
            <Link
              href="/portal/book"
              className="inline-flex items-center gap-1 text-sm text-primary-teal hover:text-primary-teal/80 font-medium mt-2"
            >
              Book your first collection
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          collections.map((collection) => {
            const colors = statusColors[collection.status] || {
              bg: "bg-slate-50",
              text: "text-slate-700",
              border: "border-slate-200",
            };
            return (
              <Link
                key={collection.id}
                href={`/portal/collections/${collection.id}`}
                className="block p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-teal-700" />
                  <span className="font-mono text-sm font-medium text-midnight-navy">
                    {collection.reference}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {collection.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-text">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {collection._count.assets}
                  </span>
                  {collection.scheduledDate && (
                    <span>
                      {new Date(collection.scheduledDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  )}
                </div>
                </div>
                {collection.statusHistory.length > 0 && (
                  <ol aria-label={`Recent journey for ${collection.reference}`} className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-l-2 border-teal-100 pl-3">
                    {[...collection.statusHistory].reverse().map((event) => (
                      <li key={event.id} className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">{event.toStatus.replace(/_/g, " ")}</span>
                        {" · "}
                        {new Date(event.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                      </li>
                    ))}
                  </ol>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
