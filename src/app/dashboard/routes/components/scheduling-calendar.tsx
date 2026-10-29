"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Package } from "lucide-react";
import type { CollectionZone } from "@prisma/client";

interface RouteWithCollections {
  id: string;
  serviceDate: Date;
  capacity: number;
  isOpen: boolean;
  zone: CollectionZone;
  _count: { collections: number };
  collections: {
    id: string;
    reference: string;
    status: string;
    customer: { name: string };
  }[];
}

interface SchedulingCalendarProps {
  routes: RouteWithCollections[];
  zones: CollectionZone[];
}

export function SchedulingCalendar({ routes, zones }: SchedulingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  // Get routes for the selected month, filtered by zone
  const monthRoutes = routes.filter((r) => {
    const routeDate = new Date(r.serviceDate);
    const matchesMonth = routeDate.getMonth() === month && routeDate.getFullYear() === year;
    const matchesZone = selectedZone === "all" || r.zone.id === selectedZone;
    return matchesMonth && matchesZone;
  });

  // Group routes by date string
  const routesByDate = monthRoutes.reduce(
    (acc, route) => {
      const dateKey = new Date(route.serviceDate).toISOString().slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(route);
      return acc;
    },
    {} as Record<string, RouteWithCollections[]>
  );

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Get selected date's routes
  const selectedDateKey = selectedDate?.toISOString().slice(0, 10);
  const selectedRoutes = selectedDateKey ? routesByDate[selectedDateKey] || [] : [];

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1.5rem" }}>
      {/* Calendar Grid */}
      <div>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={goToPrevMonth}
              className="btn btn-secondary"
              style={{ padding: "0.5rem" }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0, minWidth: "200px", textAlign: "center" }}>
              {currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={goToNextMonth}
              className="btn btn-secondary"
              style={{ padding: "0.5rem" }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="btn btn-secondary" style={{ marginLeft: "0.5rem" }}>
              Today
            </button>
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #e2e8f0",
              backgroundColor: "white",
            }}
          >
            <option value="all">All Zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        {/* Day headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "0.5rem",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              style={{
                padding: "0.5rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", backgroundColor: "#e2e8f0" }}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  style={{ backgroundColor: "#f8fafc", minHeight: "100px" }}
                />
              );
            }

            const date = new Date(year, month, day);
            const dateKey = date.toISOString().slice(0, 10);
            const dayRoutes = routesByDate[dateKey] || [];
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            const isSelected = selectedDate?.getTime() === date.getTime();

            const totalCollections = dayRoutes.reduce((sum, r) => sum + r._count.collections, 0);
            const totalCapacity = dayRoutes.reduce((sum, r) => sum + r.capacity, 0);
            const utilization = totalCapacity > 0 ? (totalCollections / totalCapacity) * 100 : 0;

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(date)}
                style={{
                  backgroundColor: isSelected ? "#f0fdfa" : "white",
                  padding: "0.5rem",
                  minHeight: "100px",
                  cursor: "pointer",
                  opacity: isPast ? 0.6 : 1,
                  borderLeft: isSelected ? "3px solid #0d9488" : "3px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: isToday ? "700" : "500",
                      color: isToday ? "#0d9488" : "#0f172a",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      backgroundColor: isToday ? "#ccfbf1" : "transparent",
                    }}
                  >
                    {day}
                  </span>
                  {dayRoutes.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "9999px",
                        backgroundColor:
                          utilization >= 100
                            ? "#fef3c7"
                            : utilization >= 75
                              ? "#dbeafe"
                              : "#d1fae5",
                        color:
                          utilization >= 100
                            ? "#b45309"
                            : utilization >= 75
                              ? "#1e40af"
                              : "#065f46",
                      }}
                    >
                      {totalCollections}/{totalCapacity}
                    </span>
                  )}
                </div>

                {/* Route indicators */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  {dayRoutes.slice(0, 3).map((route) => (
                    <div
                      key={route.id}
                      style={{
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                        backgroundColor: route.isOpen ? "#f0fdfa" : "#fef2f2",
                        color: route.isOpen ? "#0d9488" : "#b91c1c",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {route.zone.name}
                    </div>
                  ))}
                  {dayRoutes.length > 3 && (
                    <span style={{ fontSize: "0.625rem", color: "#64748b" }}>
                      +{dayRoutes.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          borderRadius: "0.5rem",
          padding: "1rem",
          border: "1px solid #e2e8f0",
        }}
      >
        {selectedDate ? (
          <>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#0f172a",
              }}
            >
              {selectedDate.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>

            {selectedRoutes.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>No routes scheduled for this date.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedRoutes.map((route) => {
                  const spacesLeft = route.capacity - route._count.collections;
                  return (
                    <div
                      key={route.id}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "0.375rem",
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <MapPin className="w-4 h-4 text-teal-600" />
                          <span style={{ fontWeight: "600", color: "#0f172a" }}>{route.zone.name}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "9999px",
                            backgroundColor: route.isOpen
                              ? spacesLeft > 0
                                ? "#d1fae5"
                                : "#fef3c7"
                              : "#fef2f2",
                            color: route.isOpen
                              ? spacesLeft > 0
                                ? "#065f46"
                                : "#b45309"
                              : "#b91c1c",
                          }}
                        >
                          {!route.isOpen ? "Closed" : spacesLeft > 0 ? `${spacesLeft} spaces` : "Full"}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>
                        {route._count.collections} / {route.capacity} collections booked
                      </div>

                      {/* Progress bar */}
                      <div
                        style={{
                          height: "4px",
                          backgroundColor: "#e2e8f0",
                          borderRadius: "2px",
                          overflow: "hidden",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, (route._count.collections / route.capacity) * 100)}%`,
                            backgroundColor:
                              route._count.collections >= route.capacity ? "#f59e0b" : "#0d9488",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      {/* Collections list */}
                      {route.collections.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {route.collections.slice(0, 5).map((collection) => (
                            <Link
                              key={collection.id}
                              href={`/dashboard/collections/${collection.id}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#f8fafc",
                                borderRadius: "0.25rem",
                                textDecoration: "none",
                                color: "#0f172a",
                              }}
                            >
                              <Package className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{collection.reference}</span>
                              <span style={{ color: "#64748b" }}>— {collection.customer.name}</span>
                            </Link>
                          ))}
                          {route.collections.length > 5 && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b", paddingLeft: "0.5rem" }}>
                              +{route.collections.length - 5} more collections
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#64748b" }}>
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p style={{ fontSize: "0.875rem" }}>Select a date to view scheduled routes and collections</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
