import { Calendar, MapPin, Users, TrendingUp } from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function Routes() {
  const { organizationId } = await requireMember();

  const routes = await prisma.routeDate.findMany({
    where: { organizationId },
    include: {
      zone: true,
      _count: {
        select: {
          collections: {
            where: { status: { not: "CANCELLED" } },
          },
        },
      },
    },
    orderBy: { serviceDate: "asc" },
    take: 100,
  });

  // Separate upcoming and past routes
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingRoutes = routes.filter((r) => r.serviceDate >= now);
  const pastRoutes = routes.filter((r) => r.serviceDate < now);

  return (
    <>
      <PageHeader
        title="Route Calendar"
        description="Published route dates and available booking capacity"
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
    </>
  );
}
