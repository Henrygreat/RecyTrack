import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

/**
 * Check if an error is a Prisma "table does not exist" error (P2021)
 * This can occur if the Notification migration hasn't been applied yet
 */
function isTableNotFoundError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  return false;
}

/**
 * Response when notification system is unavailable
 */
function notificationServiceUnavailable() {
  return NextResponse.json(
    {
      notifications: [],
      unreadCount: null, // null indicates unknown, not zero
      serviceAvailable: false,
      message: "Notification service temporarily unavailable",
    },
    { status: 200 } // Return 200 to prevent dashboard crashes
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check rate limit
  const rateLimit = await checkApiRateLimit(userId);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  // Get user's organization through membership
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { id: "asc" },
  });

  if (!membership) {
    return NextResponse.json({ error: "No organization access" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        organizationId: membership.organizationId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        organizationId: membership.organizationId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      serviceAvailable: true,
    });
  } catch (error) {
    // Handle case where Notification table doesn't exist yet
    if (isTableNotFoundError(error)) {
      console.warn(
        "Notification table not found - migration may need to be applied"
      );
      return notificationServiceUnavailable();
    }

    // Log other errors but don't crash the dashboard
    console.error("Notifications fetch error:", error);
    return notificationServiceUnavailable();
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check rate limit
  const rateLimit = await checkApiRateLimit(userId);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read for this user
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      // Validate notificationId is a string to prevent injection
      if (typeof notificationId !== "string" || notificationId.length > 50) {
        return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
      }

      // Mark single notification as read - ensures user owns the notification
      const result = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Security: Ensure user owns this notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      if (result.count === 0) {
        // Either notification doesn't exist or user doesn't own it
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    // Handle case where Notification table doesn't exist
    if (isTableNotFoundError(error)) {
      console.warn(
        "Notification table not found - migration may need to be applied"
      );
      return NextResponse.json(
        {
          error: "Notification service temporarily unavailable",
          serviceAvailable: false
        },
        { status: 503 }
      );
    }

    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
