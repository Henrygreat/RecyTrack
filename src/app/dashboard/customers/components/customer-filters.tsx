"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { useState, useTransition, useCallback } from "react";

interface CustomerFiltersProps {
  search: string;
  status: string;
  type: string;
}

export function CustomerFilters({ search, status, type }: CustomerFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "ACTIVE" && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      // Reset to page 1 when filters change
      params.delete("page");

      startTransition(() => {
        router.push(`/dashboard/customers?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchValue });
  };

  const hasActiveFilters = search || status !== "ACTIVE" || type !== "all";

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center bg-white p-4 rounded-lg border border-slate-200">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[200px] max-w-md">
        <div className="relative flex flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1 pl-10 pr-4 py-2 border border-slate-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-r-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {/* Divider */}
      <div className="h-8 w-px bg-slate-200 hidden sm:block" />

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
        >
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="all">All Status</option>
        </select>
      </div>

      {/* Type Filter */}
      <select
        value={type}
        onChange={(e) => updateFilters({ type: e.target.value })}
        className="px-3 py-2 pr-8 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
      >
        <option value="all">All Types</option>
        <option value="BUSINESS">Business</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            setSearchValue("");
            router.push("/dashboard/customers");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  );
}
