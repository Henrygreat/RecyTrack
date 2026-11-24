"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Package,
  Users,
  Shield,
  AlertTriangle,
  Award,
  UserPlus,
  Settings,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number | null;
  serviceAvailable: boolean;
  message?: string;
}

const typeIcons: Record<string, typeof Bell> = {
  COLLECTION_BOOKING: Package,
  COLLECTION_APPROVED: Package,
  COLLECTION_ASSIGNED: Package,
  COLLECTION_STATUS: Package,
  ROUTE_CHANGE: Package,
  CUSTOMER_REQUEST: Users,
  ERASURE_COMPLETE: Shield,
  DESTRUCTION_COMPLETE: Shield,
  COMPLIANCE_EXCEPTION: AlertTriangle,
  APPROVAL_REQUIRED: AlertTriangle,
  CERTIFICATE_ISSUED: Award,
  USER_INVITED: UserPlus,
  SYSTEM: Settings,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(0);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data: NotificationResponse = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount);
        setServiceAvailable(data.serviceAvailable !== false);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Non-OK response
        setServiceAvailable(false);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setServiceAvailable(false);
    }
  }, []);

  // Initial fetch and polling (with backoff when service unavailable)
  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds if service available, otherwise back off
    const pollInterval = serviceAvailable ? 30000 : Math.min(60000 * (retryCount + 1), 300000);
    const interval = setInterval(() => {
      if (!serviceAvailable) {
        setRetryCount((prev) => prev + 1);
      }
      fetchNotifications();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchNotifications, serviceAvailable, retryCount]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [isOpen, fetchNotifications]);

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

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    if (!serviceAvailable) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!serviceAvailable) return;

    setIsMarkingRead(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setRetryCount(0);
    fetchNotifications().finally(() => setIsLoading(false));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label={
          !serviceAvailable
            ? "Notifications unavailable"
            : unreadCount !== null && unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
        }
      >
        <Bell className={`w-5 h-5 ${serviceAvailable ? "text-slate-600" : "text-slate-400"}`} />
        {serviceAvailable && unreadCount !== null && unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {!serviceAvailable && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500">
            <WifiOff className="w-2 h-2 text-white" />
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {serviceAvailable && unreadCount !== null && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isMarkingRead}
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                {isMarkingRead ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {!serviceAvailable ? (
              // Service unavailable state
              <div className="py-8 text-center px-4">
                <WifiOff className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  Notifications temporarily unavailable
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  The notification service is being set up
                </p>
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  We&apos;ll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type] || Bell;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        !notification.isRead ? "bg-teal-50/50" : ""
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          !notification.isRead ? "bg-teal-100" : "bg-slate-100"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            !notification.isRead ? "text-teal-600" : "text-slate-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            !notification.isRead ? "font-medium text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-teal-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {serviceAvailable && notifications.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-2">
              <button
                onClick={() => {
                  router.push("/dashboard/notifications");
                  setIsOpen(false);
                }}
                className="w-full text-center text-xs text-teal-600 hover:text-teal-700 font-medium py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
