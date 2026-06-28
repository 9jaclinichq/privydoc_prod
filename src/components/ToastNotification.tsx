import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;
let listeners: Listener[] = [];
let toasts: ToastItem[] = [];

const notify = () => {
  listeners.forEach((listener) => listener([...toasts]));
};

export const toast = {
  show: (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, message, type };
    toasts = [...toasts, newToast];
    notify();
    setTimeout(() => {
      toast.dismiss(id);
    }, 4000);
  },
  success: (message: string) => toast.show(message, "success"),
  error: (message: string) => toast.show(message, "error"),
  warning: (message: string) => toast.show(message, "warning"),
  info: (message: string) => toast.show(message, "info"),
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }
};

export const useToast = () => {
  const [currentToasts, setCurrentToasts] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => {
      setCurrentToasts(newToasts);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return {
    toasts: currentToasts,
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    dismiss: toast.dismiss,
  };
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-50 flex flex-col gap-3 w-[calc(100%-2rem)] md:w-[380px] pointer-events-none">
      {toasts.map((item) => {
        let borderClass = "";
        let textClass = "";
        let bgClass = "bg-[#1a1a1a]";
        let IconComponent = Info;

        switch (item.type) {
          case "success":
            borderClass = "border-l-4 border-emerald-500";
            textClass = "text-emerald-400";
            IconComponent = CheckCircle;
            break;
          case "error":
            borderClass = "border-l-4 border-rose-500";
            textClass = "text-rose-400";
            IconComponent = AlertCircle;
            break;
          case "warning":
            borderClass = "border-l-4 border-[#C9A84C]";
            textClass = "text-[#C9A84C]";
            IconComponent = AlertTriangle;
            break;
          case "info":
            borderClass = "border-l-4 border-sky-500";
            textClass = "text-sky-400";
            IconComponent = Info;
            break;
        }

        return (
          <div
            key={item.id}
            className={`flex items-start justify-between p-4 rounded-xl shadow-2xl pointer-events-auto transition-all duration-300 animate-slide-in-right ${bgClass} ${borderClass} border border-zinc-800/60 backdrop-blur-md`}
            style={{
              animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <div className="flex gap-3">
              <IconComponent className={`w-5 h-5 shrink-0 ${textClass} mt-0.5`} />
              <p className="text-xs text-zinc-300 font-sans leading-relaxed pr-2 font-medium">
                {item.message}
              </p>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800/40 shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
