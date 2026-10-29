import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { DriverCollectionList } from "./components/driver-collection-list";

export default async function DriverDashboard() {
  const { userId, organizationId } = await requireMember();

  // Get user's name for matching driver assignments
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get collections assigned to this driver (by driverId or driverName)
  const collections = await prisma.collection.findMany({
    where: {
      organizationId,
      OR: [
        { driverId: userId },
        { driverName: user?.name || undefined },
      ],
      status: { in: ["ASSIGNED", "IN_TRANSIT", "COLLECTED"] },
    },
    include: {
      customer: { select: { name: true } },
      site: { select: { name: true } },
      routeDate: { include: { zone: true } },
    },
    orderBy: [
      { routeDate: { serviceDate: "asc" } },
      { postcode: "asc" },
    ],
  });

  // Separate today's collections from future ones
  const todayCollections = collections.filter((c) => {
    if (!c.routeDate) return false;
    const serviceDate = new Date(c.routeDate.serviceDate);
    return serviceDate >= today && serviceDate < tomorrow;
  });

  const upcomingCollections = collections.filter((c) => {
    if (!c.routeDate) return true; // Include unscheduled
    const serviceDate = new Date(c.routeDate.serviceDate);
    return serviceDate >= tomorrow;
  });

  return (
    <div style={{ maxWidth: "100%", padding: "1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          Driver Dashboard
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.875rem" }}>
          {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#f0fdfa",
            borderRadius: "0.5rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0d9488" }}>
            {todayCollections.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Today</div>
        </div>
        <div
          style={{
            backgroundColor: "#eff6ff",
            borderRadius: "0.5rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#3b82f6" }}>
            {collections.filter((c) => c.status === "IN_TRANSIT").length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>In Transit</div>
        </div>
        <div
          style={{
            backgroundColor: "#fef3c7",
            borderRadius: "0.5rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f59e0b" }}>
            {collections.filter((c) => c.status === "COLLECTED").length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Collected</div>
        </div>
      </div>

      {/* Today's Collections */}
      <section style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
          Today&apos;s Route
        </h2>

        {todayCollections.length === 0 ? (
          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: "0.5rem",
              padding: "2rem",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <p style={{ margin: 0 }}>No collections assigned for today.</p>
          </div>
        ) : (
          <DriverCollectionList collections={todayCollections} />
        )}
      </section>

      {/* Upcoming Collections */}
      {upcomingCollections.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              color: "#0f172a",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#94a3b8",
              }}
            />
            Upcoming ({upcomingCollections.length})
          </h2>
          <DriverCollectionList collections={upcomingCollections} compact />
        </section>
      )}
    </div>
  );
}
