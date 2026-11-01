"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Building2,
  Package,
  Truck,
  RefreshCw,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  getCustomersSummary,
  getCustomerReport,
  type CustomerReport,
} from "../actions";

// ============================================
// CUSTOMER LIST
// ============================================

function CustomerList({
  customers,
  selectedId,
  onSelect,
}: {
  customers: { id: string; name: string; collections: number; assets: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No customers found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer.id)}
                className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 ${
                  selectedId === customer.id ? "bg-blue-50" : ""
                }`}
              >
                <div>
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {customer.collections} collections
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {customer.assets} assets
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CUSTOMER DETAIL
// ============================================

function CustomerDetail({ report }: { report: CustomerReport }) {
  const statusColors: Record<string, string> = {
    RECEIVED: "bg-yellow-100 text-yellow-800",
    INSPECTION: "bg-blue-100 text-blue-800",
    QUARANTINED: "bg-red-100 text-red-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    READY: "bg-green-100 text-green-800",
    RELEASED: "bg-gray-100 text-gray-800",
  };

  const collectionStatusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{report.customerName}</h2>
          <p className="mt-1 text-sm text-gray-500">Customer ID: {report.customerId}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{report.totalAssets}</div>
          <div className="text-sm text-gray-500">Total Assets</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Collections</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{report.totalCollections}</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Assets Processed</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-green-900">
            {report.assetsByStatus
              .filter((s) => s.status === "RELEASED" || s.status === "READY")
              .reduce((sum, s) => sum + s.count, 0)}
          </div>
        </div>
      </div>

      {/* Asset Status Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 font-semibold text-gray-900">Assets by Status</h3>
        {report.assetsByStatus.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {report.assetsByStatus.map((status) => (
              <div
                key={status.status}
                className={`rounded-lg p-3 ${statusColors[status.status] || "bg-gray-100 text-gray-800"}`}
              >
                <div className="text-lg font-bold">{status.count}</div>
                <div className="text-xs opacity-80">{status.status.replace("_", " ")}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500">No assets recorded</div>
        )}
      </div>

      {/* Recent Collections */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Recent Collections</h3>
        </div>
        {report.recentCollections.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {report.recentCollections.map((collection) => (
              <div key={collection.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {collection.reference}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${collectionStatusColors[collection.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {collection.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {collection.scheduledDate
                      ? new Date(collection.scheduledDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not scheduled"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{collection.totalItems}</div>
                  <div className="text-xs text-gray-500">items</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">No collections recorded</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CustomerReportsPage() {
  const [customers, setCustomers] = useState<
    { id: string; name: string; collections: number; assets: number }[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerReport, setCustomerReport] = useState<CustomerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await getCustomersSummary();
      if (result.success && result.customers) {
        setCustomers(result.customers);
        // Auto-select first customer if available
        if (result.customers.length > 0 && !selectedCustomer) {
          setSelectedCustomer(result.customers[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReport = async (customerId: string) => {
    setLoadingReport(true);
    try {
      const result = await getCustomerReport(customerId);
      if (result.success && result.report) {
        setCustomerReport(result.report);
      }
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerReport(selectedCustomer);
    }
  }, [selectedCustomer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/reports"
            className="rounded-lg p-2 hover:bg-gray-100"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Reports</h1>
            <p className="text-sm text-gray-500">Customer-specific asset and collection data</p>
          </div>
        </div>
        <button
          onClick={loadCustomers}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Customers</h2>
          <p className="mt-2 text-sm text-gray-500">
            Customer reports will appear once customers are added to the system.
          </p>
          <Link
            href="/dashboard/customers"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Building2 className="h-4 w-4" />
            Manage Customers
          </Link>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-200px)] min-h-[500px] grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Customer List */}
          <div className="rounded-lg border border-gray-200 bg-white lg:col-span-1">
            <CustomerList
              customers={customers}
              selectedId={selectedCustomer}
              onSelect={setSelectedCustomer}
            />
          </div>

          {/* Customer Detail */}
          <div className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
            {loadingReport ? (
              <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : customerReport ? (
              <CustomerDetail report={customerReport} />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Select a customer to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
