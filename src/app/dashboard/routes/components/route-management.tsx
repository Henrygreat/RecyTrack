"use client";

import { useState, useActionState } from "react";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  X,
  Repeat,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  createRouteDate,
  createZone,
  createRecurringRoutes,
  toggleRouteStatus,
  deleteRouteDate,
  type RouteDateFormState,
  type ZoneFormState,
} from "../actions";

interface Zone {
  id: string;
  name: string;
  postcodePrefixes: string[];
  _count: { routeDates: number; sites: number };
}

interface RouteDate {
  id: string;
  serviceDate: Date;
  capacity: number;
  isOpen: boolean;
  zone: { name: string };
  _count: { collections: number };
}

interface RouteManagementProps {
  zones: Zone[];
  routes: RouteDate[];
}

export function RouteManagement({ zones, routes }: RouteManagementProps) {
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button
        onClick={() => setShowCreateRoute(true)}
        className="btn"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Plus className="w-4 h-4" />
        Publish Route
      </button>
      <button
        onClick={() => setShowRecurring(true)}
        className="btn btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <Repeat className="w-4 h-4" />
        Recurring
      </button>
      <button
        onClick={() => setShowCreateZone(true)}
        className="btn btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        <MapPin className="w-4 h-4" />
        Manage Zones
      </button>

      {/* Create Single Route Modal */}
      {showCreateRoute && (
        <CreateRouteModal
          zones={zones}
          onClose={() => setShowCreateRoute(false)}
        />
      )}

      {/* Create Zone Modal */}
      {showCreateZone && (
        <ZoneManagementModal
          zones={zones}
          onClose={() => setShowCreateZone(false)}
        />
      )}

      {/* Create Recurring Routes Modal */}
      {showRecurring && (
        <RecurringRoutesModal
          zones={zones}
          onClose={() => setShowRecurring(false)}
        />
      )}
    </div>
  );
}

function CreateRouteModal({
  zones,
  onClose,
}: {
  zones: Zone[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<RouteDateFormState, FormData>(
    createRouteDate,
    {}
  );

  if (state.success) {
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "480px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Publish Route Date</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
              Create a new collection date for customers to book
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer" }}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
          {state.error && (
            <div
              className="wide"
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.375rem",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {state.error}
            </div>
          )}

          <div className="field wide">
            <label htmlFor="zoneId">Collection Zone *</label>
            <select id="zoneId" name="zoneId" required>
              <option value="">Select a zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.postcodePrefixes.join(", ") || "No postcodes"})
                </option>
              ))}
            </select>
          </div>

          <div className="field wide">
            <label htmlFor="serviceDate">Service Date *</label>
            <input
              type="date"
              id="serviceDate"
              name="serviceDate"
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="field wide">
            <label htmlFor="capacity">Booking Capacity *</label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              required
              min={1}
              max={100}
              defaultValue={10}
            />
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
              Maximum number of collections that can be booked on this date
            </p>
          </div>

          <div className="field wide">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" name="isOpen" value="true" defaultChecked />
              <span>Open for bookings immediately</span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isPending}>
              {isPending ? "Publishing..." : "Publish Route"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ZoneManagementModal({
  zones,
  onClose,
}: {
  zones: Zone[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ZoneFormState, FormData>(
    createZone,
    {}
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Collection Zones</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
              Manage zones and their postcode coverage
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer" }}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Existing Zones */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#334155", marginBottom: "0.75rem" }}>
            Existing Zones
          </h3>
          {zones.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "#64748b" }}>No zones created yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "500" }}>{zone.name}</span>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.125rem" }}>
                      {zone.postcodePrefixes.length > 0
                        ? zone.postcodePrefixes.join(", ")
                        : "No postcodes assigned"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#64748b" }}>
                    <span>{zone._count.routeDates} routes</span>
                    <span>{zone._count.sites} sites</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Zone */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#334155", marginBottom: "0.75rem" }}>
            Create New Zone
          </h3>

          <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
            {state.error && (
              <div
                className="wide"
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.375rem",
                  color: "#b91c1c",
                  fontSize: "0.875rem",
                }}
              >
                {state.error}
              </div>
            )}

            {state.success && (
              <div
                className="wide"
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "0.375rem",
                  color: "#15803d",
                  fontSize: "0.875rem",
                }}
              >
                Zone created successfully
              </div>
            )}

            <div className="field">
              <label htmlFor="name">Zone Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., North London"
              />
            </div>

            <div className="field">
              <label htmlFor="postcodePrefixes">Postcode Prefixes</label>
              <input
                type="text"
                id="postcodePrefixes"
                name="postcodePrefixes"
                placeholder="e.g., N1, N2, N3, N4"
              />
              <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                Comma-separated postcode prefixes this zone covers
              </p>
            </div>

            <div className="form-actions wide">
              <button type="submit" className="btn" disabled={isPending}>
                {isPending ? "Creating..." : "Create Zone"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RecurringRoutesModal({
  zones,
  onClose,
}: {
  zones: Zone[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ created: number; skipped: number } | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    const result = await createRecurringRoutes({
      zoneId: formData.get("zoneId") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      daysOfWeek: selectedDays,
      capacity: parseInt(formData.get("capacity") as string, 10),
      isOpen: formData.get("isOpen") === "true",
    });

    setLoading(false);

    if (result.success) {
      setSuccess({ created: result.created || 0, skipped: result.skipped || 0 });
    } else {
      setError(result.error || "Failed to create routes");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "520px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Create Recurring Routes</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
              Bulk create routes for multiple dates
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer" }}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form" style={{ maxWidth: "100%" }}>
          {error && (
            <div
              className="wide"
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.375rem",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="wide"
              style={{
                padding: "0.75rem",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "0.375rem",
                color: "#15803d",
                fontSize: "0.875rem",
              }}
            >
              Created {success.created} routes
              {success.skipped > 0 && ` (${success.skipped} skipped - already exist)`}
            </div>
          )}

          <div className="field wide">
            <label htmlFor="zoneId">Collection Zone *</label>
            <select id="zoneId" name="zoneId" required>
              <option value="">Select a zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="startDate">Start Date *</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="field">
            <label htmlFor="endDate">End Date *</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              required
            />
          </div>

          <div className="field wide">
            <label>Days of Week *</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {dayNames.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDays((prev) =>
                      prev.includes(index)
                        ? prev.filter((d) => d !== index)
                        : [...prev, index]
                    );
                  }}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid",
                    borderColor: selectedDays.includes(index) ? "#0d9488" : "#e2e8f0",
                    backgroundColor: selectedDays.includes(index) ? "#0d9488" : "white",
                    color: selectedDays.includes(index) ? "white" : "#334155",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="field wide">
            <label htmlFor="capacity">Capacity per Route *</label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              required
              min={1}
              max={100}
              defaultValue={10}
            />
          </div>

          <div className="field wide">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" name="isOpen" value="true" defaultChecked />
              <span>Open for bookings immediately</span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading || selectedDays.length === 0}
            >
              {loading ? "Creating..." : "Create Routes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Route Row Actions Component
export function RouteRowActions({
  route,
}: {
  route: RouteDate;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await toggleRouteStatus(route.id);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    setLoading(true);
    const result = await deleteRouteDate(route.id);
    if (!result.success) {
      alert(result.error);
    }
    setLoading(false);
  };

  const canDelete = route._count.collections === 0;

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={route.isOpen ? "Close bookings" : "Open bookings"}
        style={{
          padding: "0.375rem",
          background: "none",
          border: "none",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {route.isOpen ? (
          <ToggleRight className="w-5 h-5 text-green-600" />
        ) : (
          <ToggleLeft className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={loading}
          title="Delete route"
          style={{
            padding: "0.375rem",
            background: "none",
            border: "none",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}
