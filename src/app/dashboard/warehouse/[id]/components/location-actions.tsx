"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Trash2, MoreVertical } from "lucide-react";
import { toggleWarehouseLocationStatus, deleteWarehouseLocation } from "../../actions";
import type { WarehouseLocation } from "@prisma/client";

type Props = {
  location: WarehouseLocation & { assets?: { id: string }[] };
};

export function LocationActions({ location }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetCount = location.assets?.length || 0;

  const handleToggleStatus = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleWarehouseLocationStatus(location.id);
      if (result.error) {
        setError(result.error);
      } else {
        setShowMenu(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (assetCount > 0) {
      setError(`Cannot delete location with ${assetCount} assigned assets`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${location.name}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteWarehouseLocation(location.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard/warehouse");
      }
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        disabled={isPending}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
            <button
              onClick={handleToggleStatus}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {location.isActive ? (
                <>
                  <PowerOff className="w-4 h-4" />
                  Deactivate Location
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  Activate Location
                </>
              )}
            </button>
            <hr className="my-1 border-slate-100" />
            <button
              onClick={handleDelete}
              disabled={isPending || assetCount > 0}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete Location
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-64 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 z-20">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
