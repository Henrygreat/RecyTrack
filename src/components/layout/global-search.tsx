"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Box,
  Users,
  MapPin,
  Package,
  Shield,
  Trash2,
  Loader2,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "asset" | "customer" | "site" | "collection" | "erasure" | "destruction";
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, string>;
}

const typeIcons = {
  asset: Box,
  customer: Users,
  site: MapPin,
  collection: Package,
  erasure: Shield,
  destruction: Trash2,
};

const typeLabels = {
  asset: "Assets",
  customer: "Customers",
  site: "Sites",
  collection: "Collections",
  erasure: "Erasure Jobs",
  destruction: "Destruction Jobs",
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        navigateToResult(results[selectedIndex]);
      }
    },
    [results, selectedIndex]
  );

  const navigateToResult = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search... (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-64 lg:w-80 pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Searching...</span>
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No results found for &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, items]) => {
                const Icon = typeIcons[type as keyof typeof typeIcons];
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </div>
                    {items.map((result, idx) => {
                      const flatIndex = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          onClick={() => navigateToResult(result)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                            flatIndex === selectedIndex ? "bg-slate-100" : ""
                          }`}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-slate-500 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          {result.metadata?.status && (
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                              {result.metadata.status.replace(/_/g, " ")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
