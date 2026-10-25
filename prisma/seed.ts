import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const orgName = process.env.SEED_ORG_NAME || "Demo Recycling Ltd";
  const slug = "demo-recycling";

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and a unique SEED_ADMIN_PASSWORD of at least 12 characters"
    );
  }

  // Create or get the organization
  let org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    org = await prisma.organization.create({
      data: { slug, name: orgName },
    });
    console.log(`Created organization: ${org.name}`);
  } else {
    console.log(`Organization already exists: ${org.name}`);
  }

  // Create or get the admin user - NEVER overwrite existing password
  let user = await prisma.user.findUnique({ where: { email } });
  let userCreated = false;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "Platform Administrator",
        passwordHash: await hash(password, 12),
      },
    });
    userCreated = true;
    console.log(`Created admin user: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email} (password unchanged)`);
  }

  // Create or update membership (safe to update role)
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "OWNER" },
    });
    console.log(`Created OWNER membership for ${email}`);
  } else {
    console.log(`Membership already exists for ${email} (role: ${existingMembership.role})`);
  }

  // Create sample collection zones if they don't exist
  const zones = [
    { name: "Telford & Shrewsbury", prefixes: ["TF", "SY"] },
    { name: "Birmingham & Wolverhampton", prefixes: ["B", "WV"] },
  ];

  for (const zoneData of zones) {
    let zone = await prisma.collectionZone.findFirst({
      where: { organizationId: org.id, name: zoneData.name },
    });

    if (!zone) {
      zone = await prisma.collectionZone.create({
        data: {
          organizationId: org.id,
          name: zoneData.name,
          postcodePrefixes: zoneData.prefixes,
        },
      });
      console.log(`Created collection zone: ${zone.name}`);
    }

    // Create sample route dates for the next 4 weeks (only if they don't exist)
    for (let i = 1; i <= 4; i++) {
      const serviceDate = new Date();
      serviceDate.setUTCDate(serviceDate.getUTCDate() + i * 7);
      serviceDate.setUTCHours(12, 0, 0, 0);

      const existingRoute = await prisma.routeDate.findUnique({
        where: { zoneId_serviceDate: { zoneId: zone.id, serviceDate } },
      });

      if (!existingRoute) {
        await prisma.routeDate.create({
          data: {
            organizationId: org.id,
            zoneId: zone.id,
            serviceDate,
            capacity: 8,
          },
        });
      }
    }
  }

  console.log("\nSeed complete.");
  if (userCreated) {
    console.log(`Login email: ${email}`);
    console.log("IMPORTANT: Change the password before production use.");
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
