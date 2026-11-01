"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  HardDrive,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getCustomersWithEligibleMedia,
  getEligibleMedia,
  checkEligibility,
  createCertificate,
} from "../actions";
import type { CertificateType } from "@prisma/client";

type Step = "customer" | "media" | "review" | "confirm";

type CustomerItem = {
  id: string;
  name: string;
  reference: string;
  _count: { assets: number };
};

type MediaItem = {
  id: string;
  reference: string;
  serialNumber: string | null;
  mediaType: string;
  capacity: string | null;
  asset: {
    id: string;
    assetTag: string;
    category: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
  } | null;
  customer: {
    id: string;
    name: string;
    reference: string;
  } | null;
  processingType: "ERASURE" | "DESTRUCTION" | null;
  processingMethod: string | null;
  processingDate: Date | null;
  verifiedBy: string | null;
};

type EligibilityResult = {
  allEligible: boolean;
  eligibleCount: number;
  ineligibleCount: number;
  customerId: string | null;
  customerName: string | null;
  certificateType: CertificateType;
  items: Array<{
    eligible: boolean;
    errors: string[];
    warnings: string[];
    details: {
      storageMediaId: string;
      mediaReference: string;
      serialNumber: string | null;
      assetTag: string;
      processingType: "ERASURE" | "DESTRUCTION" | null;
      processingMethod: string | null;
    };
  }>;
  globalErrors: string[];
};

export default function NewCertificatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("customer");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer selection
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Media selection
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [mediaSearch, setMediaSearch] = useState("");

  // Eligibility
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [certificateType, setCertificateType] = useState<CertificateType>("BATCH");

  // Notes
  const [notes, setNotes] = useState("");

  // Load customers
  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      const result = await getCustomersWithEligibleMedia();
      if (result.success && result.customers) {
        setCustomers(result.customers as CustomerItem[]);
      }
      setLoading(false);
    }
    loadCustomers();
  }, []);

  // Load media when customer selected
  useEffect(() => {
    if (!selectedCustomerId) {
      setMedia([]);
      return;
    }

    async function loadMedia() {
      setLoading(true);
      const result = await getEligibleMedia({ customerId: selectedCustomerId || undefined });
      if (result.success && result.media) {
        setMedia(result.media as MediaItem[]);
      }
      setLoading(false);
    }
    loadMedia();
  }, [selectedCustomerId]);

  // Check eligibility when going to review
  const handleCheckEligibility = async () => {
    if (selectedMediaIds.size === 0) return;

    setLoading(true);
    const result = await checkEligibility(Array.from(selectedMediaIds));
    if (result.success && result.eligibility) {
      setEligibility(result.eligibility as EligibilityResult);
      // Auto-select certificate type based on eligibility
      setCertificateType(result.eligibility.certificateType);
      setStep("review");
    }
    setLoading(false);
  };

  // Create certificate
  const handleCreateCertificate = async () => {
    if (!eligibility?.allEligible) return;

    setSubmitting(true);
    const result = await createCertificate({
      storageMediaIds: Array.from(selectedMediaIds),
      certificateType,
      notes: notes || undefined,
    });

    if (result.success && result.certificate) {
      router.push(`/dashboard/certificates/${result.certificate.id}`);
    } else {
      alert(result.error || "Failed to create certificate");
    }
    setSubmitting(false);
  };

  // Filter helpers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.reference.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredMedia = media.filter(
    (m) =>
      m.reference.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      m.serialNumber?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      m.asset?.assetTag.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  // Toggle media selection
  const toggleMedia = (id: string) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMediaIds(newSet);
  };

  const selectAllMedia = () => {
    setSelectedMediaIds(new Set(filteredMedia.map((m) => m.id)));
  };

  const deselectAllMedia = () => {
    setSelectedMediaIds(new Set());
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/certificates"
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Certificate</h1>
          <p className="text-sm text-slate-500">
            Create a sanitisation certificate for verified media
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {(["customer", "media", "review", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? "bg-teal-600 text-white"
                    : (["customer", "media", "review", "confirm"].indexOf(step) > i)
                    ? "bg-teal-100 text-teal-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {["customer", "media", "review", "confirm"].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="ml-2 text-sm text-slate-600 capitalize">{s}</span>
              {i < 3 && <div className="mx-4 h-px w-12 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step: Customer Selection */}
      {step === "customer" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Select Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building className="h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">
                  No customers with eligible media found
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedCustomerId === customer.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{customer.name}</p>
                        <p className="text-sm text-slate-500">{customer.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          {customer._count.assets} assets with eligible media
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep("media")}
                disabled={!selectedCustomerId}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Media Selection */}
      {step === "media" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Select Media Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-600">
                  Customer: <span className="font-medium">{selectedCustomer.name}</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <button
                onClick={selectAllMedia}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                Select All
              </button>
              <button
                onClick={deselectAllMedia}
                className="text-sm text-slate-600 hover:text-slate-700"
              >
                Deselect All
              </button>
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <HardDrive className="h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">
                  No eligible media found for this customer
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedMediaIds.size === filteredMedia.length && filteredMedia.length > 0}
                          onChange={(e) => e.target.checked ? selectAllMedia() : deselectAllMedia()}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Processing</th>
                      <th className="px-4 py-3">Verified By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMedia.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => toggleMedia(m.id)}
                        className={`cursor-pointer ${
                          selectedMediaIds.has(m.id) ? "bg-teal-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMediaIds.has(m.id)}
                            onChange={() => toggleMedia(m.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm font-medium">{m.reference}</p>
                          <p className="text-xs text-slate-500">
                            {m.mediaType} {m.capacity && `- ${m.capacity}`}
                          </p>
                          {m.serialNumber && (
                            <p className="text-xs text-slate-400">S/N: {m.serialNumber}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.asset ? (
                            <>
                              <p className="text-sm font-medium">{m.asset.assetTag}</p>
                              <p className="text-xs text-slate-500">
                                {m.asset.manufacturer} {m.asset.model}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.processingType === "DESTRUCTION"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {m.processingType || "Unknown"}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{m.processingMethod}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {m.verifiedBy || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("customer")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-sm text-slate-600">
                {selectedMediaIds.size} item{selectedMediaIds.size !== 1 && "s"} selected
              </div>
              <button
                onClick={handleCheckEligibility}
                disabled={selectedMediaIds.size === 0 || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Check Eligibility
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review Eligibility */}
      {step === "review" && eligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Review Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className={`rounded-lg p-4 ${
              eligibility.allEligible ? "bg-green-50" : "bg-red-50"
            }`}>
              <div className="flex items-center gap-3">
                {eligibility.allEligible ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    eligibility.allEligible ? "text-green-800" : "text-red-800"
                  }`}>
                    {eligibility.allEligible
                      ? "All items are eligible for certification"
                      : `${eligibility.ineligibleCount} item(s) are not eligible`}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {eligibility.eligibleCount} eligible, {eligibility.ineligibleCount} ineligible
                  </p>
                </div>
              </div>
            </div>

            {/* Global Errors */}
            {eligibility.globalErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-medium text-red-800 mb-2">Issues found:</p>
                <ul className="list-disc list-inside space-y-1">
                  {eligibility.globalErrors.map((error, i) => (
                    <li key={i} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Certificate Type */}
            {eligibility.allEligible && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Certificate Type
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value as CertificateType)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="DATA_ERASURE">Data Erasure Certificate</option>
                  <option value="PHYSICAL_DESTRUCTION">Physical Destruction Certificate</option>
                  <option value="BATCH">Batch Certificate</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Recommended: {eligibility.certificateType.replace(/_/g, " ")}
                </p>
              </div>
            )}

            {/* Item Details */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Item Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Processing</th>
                      <th className="px-4 py-3">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {eligibility.items.map((item) => (
                      <tr key={item.details.storageMediaId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {item.eligible ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm font-medium">
                            {item.details.mediaReference}
                          </p>
                          {item.details.serialNumber && (
                            <p className="text-xs text-slate-500">
                              S/N: {item.details.serialNumber}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            Asset: {item.details.assetTag}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.details.processingType === "DESTRUCTION"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.details.processingType || "Unknown"}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.details.processingMethod}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.errors.length > 0 && (
                            <ul className="space-y-1">
                              {item.errors.map((error, i) => (
                                <li key={i} className="flex items-start gap-1 text-xs text-red-600">
                                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {error}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.warnings.length > 0 && (
                            <ul className="space-y-1 mt-1">
                              {item.warnings.map((warning, i) => (
                                <li key={i} className="flex items-start gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.errors.length === 0 && item.warnings.length === 0 && (
                            <span className="text-xs text-green-600">No issues</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("media")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!eligibility.allEligible}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && eligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Confirm Certificate Creation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Info */}
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Customer</span>
                <span className="text-sm font-medium">{eligibility.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Certificate Type</span>
                <span className="text-sm font-medium">{certificateType.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Media Items</span>
                <span className="text-sm font-medium">{eligibility.eligibleCount}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this certificate..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">What happens next?</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>A draft certificate will be created</li>
                    <li>You can review and submit it for approval</li>
                    <li>Once approved, a PDF certificate will be available</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("review")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleCreateCertificate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    Create Certificate
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
