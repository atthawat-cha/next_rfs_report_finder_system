"use client";

import React from "react";
import { useRouter } from "@/i18n/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unread_count);
      }
    } catch {
      // silent — polling, no need to surface transient network errors
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClickNotification = async (n: NotificationRow) => {
    if (!n.is_read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST", credentials: "include" });
      fetchNotifications();
    }
    if (n.link) router.push(n.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative h-8 w-8 rounded-full">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel>การแจ้งเตือน</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-0.5 whitespace-normal py-2 hover:cursor-pointer"
                onClick={() => handleClickNotification(n)}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{n.message}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
