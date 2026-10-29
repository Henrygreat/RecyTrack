import { Calendar, MapPin, Users, TrendingUp, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SchedulingCalendar } from "./components/scheduling-calendar";

interface SearchParams {
  view?: string;
}

export default async function Routes({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId } = await requireMember();
  const params = await searchParams;
  const view = params.view || "calendar";

  const [routes, zones] = await Promise.all([
    prisma.routeDate.findMany({
      where: { organizationId },
      include: {
        zone: true,
        collections: {
          where: { status: { notIn: ["CANCELLED"] } },
          select: {
            id: true,
            reference: true,
            status: true,
            customer: { select: { name: true } },
          },
          take: 10,
        },
        _count: {
          select: {
            collections: {
              where: { status: { not: "CANCELLED" } },
            },
          },
        },
      },
      orderBy: { serviceDate: "asc" },
      take: 200,
    }),
    prisma.collectionZone.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  // Separate upcoming and past routes
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingRoutes = routes.filter((r) => r.serviceDate >= now);

  return (
    <>
      <PageHeader
        title="Route Calendar"
        description="Published route dates and available booking capacity"
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/dashboard/routes?view=calendar"
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                view === "calendar"
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Calendar
            </Link>
            <Link
              href="/dashboard/routes?view=list"
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                view === "list"
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </Link>
          </div>
        }
      />

      {/* Summary metrics */}
      <div className="cards" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Upcoming Routes</span>
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">{upcomingRoutes.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Bookings</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">
            {routes.reduce((sum, r) => sum + r._count.collections, 0)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Available Capacity</span>
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <div className="metric-value">
            {upcomingRoutes
              .filter((r) => r.isOpen)
              .reduce((sum, r) => sum + Math.max(0, r.capacity - r._count.collections), 0)}
          </div>
        </div>
      </div>

      {view === "calendar" ? (
        <Card>
          <CardContent style={{ paddingTop: "1.5rem" }}>
            {routes.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No routes published"
                description="Routes can be created through the admin panel or seed script."
              />
            ) : (
              <SchedulingCalendar routes={routes} zones={zones} />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Route Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {routes.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No routes published"
                description="Routes can be created through the admin panel or seed script."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          Date
                        </div>
                      </th>
                      <th>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          Zone
                        </div>
                      </th>
                      <th>Bookings</th>
                      <th>Capacity</th>
                      <th>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => {
                      const spacesLeft = Math.max(0, route.capacity - route._count.collections);
                      const isPast = route.serviceDate < now;
                      const isFull = spacesLeft === 0;

                      return (
                        <tr
                          key={route.id}
                          style={{ opacity: isPast ? 0.5 : 1 }}
                        >
                          <td>
                            <span className="font-medium text-slate-900">
                              {route.serviceDate.toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                          <td className="text-slate-600">{route.zone.name}</td>
                          <td>
                            <span className="font-medium">{route._count.collections}</span>
                          </td>
                          <td className="text-slate-600">{route.capacity}</td>
                          <td>
                            {!route.isOpen ? (
                              <span className="badge" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>
                                Closed
                              </span>
                            ) : isPast ? (
                              <span className="badge" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                                Past
                              </span>
                            ) : isFull ? (
                              <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
                                Full
                              </span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                                {spacesLeft} {spacesLeft === 1 ? "space" : "spaces"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
