import React from "react";
import { Bell } from "lucide-react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  formatDate: (d: string) => string;
}

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
  formatDate
}: NotificationPanelProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-900">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Notifications</h4>
        {notifications.some(n => !n.read) && (
          <button
            onClick={onMarkAllRead}
            className="text-[10px] font-mono text-[#E5C158] hover:underline font-bold"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Bell className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-xs text-zinc-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors ${
                !n.read ? "border-l-2 border-l-[#C9A84C] bg-[#C9A84C]/5" : ""
              }`}
            >
              <p className="text-xs font-bold text-white">{n.title}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
              <p className="text-[9px] text-zinc-600 font-mono mt-1">{formatDate(n.created_at)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
