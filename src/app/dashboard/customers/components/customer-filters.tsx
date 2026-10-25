"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter } from "lucide-react";
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

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.5rem",
        alignItems: "center",
      }}
    >
      {/* Search */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          flex: "1 1 300px",
          minWidth: "200px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
          }}
        >
          <Search
            className="w-4 h-4"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              flex: 1,
              paddingLeft: "2.5rem",
              paddingRight: "1rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          />
        </div>
        <button
          type="submit"
          className="btn"
          style={{ marginLeft: "0.5rem" }}
          disabled={isPending}
        >
          Search
        </button>
      </form>

      {/* Status Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          style={{
            padding: "0.5rem 2rem 0.5rem 0.75rem",
            border: "1px solid #e2e8f0",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            backgroundColor: "white",
          }}
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
        style={{
          padding: "0.5rem 2rem 0.5rem 0.75rem",
          border: "1px solid #e2e8f0",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          backgroundColor: "white",
        }}
      >
        <option value="all">All Types</option>
        <option value="BUSINESS">Business</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>

      {/* Clear filters */}
      {(search || status !== "ACTIVE" || type !== "all") && (
        <button
          onClick={() => {
            setSearchValue("");
            router.push("/dashboard/customers");
          }}
          className="btn btn-secondary"
          style={{ fontSize: "0.875rem" }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
