import React, { useState, useEffect } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  cancelIsGold?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

type ConfirmListener = (state: ConfirmState | null) => void;
let listener: ConfirmListener | null = null;

export const confirm = (message: string, options: ConfirmOptions = {}): Promise<boolean> => {
  return new Promise((resolve) => {
    if (listener) {
      listener({
        isOpen: true,
        message,
        ...options,
        resolve: (val) => {
          if (listener) listener(null);
          resolve(val);
        }
      });
    } else {
      // Direct native fallback if the component is not mounted yet
      resolve(window.confirm(message));
    }
  });
};

export function ConfirmModal() {
  const [state, setState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const activeListener = (newState: ConfirmState | null) => {
      setState(newState);
    };
    listener = activeListener;
    return () => {
      if (listener === activeListener) {
        listener = null;
      }
    };
  }, []);

  if (!state || !state.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="w-full max-w-sm bg-[#161c25] border border-zinc-800/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-slide-up"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-md font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {state.title || "CONFIRM ACTION"}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-[260px]">
            {state.message}
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => state.resolve(false)}
            className={
              state.cancelIsGold
                ? "flex-1 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#d4af37]/10"
                : "flex-1 py-2.5 bg-transparent hover:bg-zinc-800/40 text-zinc-400 hover:text-white font-bold text-xs rounded-xl transition-colors border border-zinc-800 hover:border-zinc-700"
            }
          >
            {state.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={() => state.resolve(true)}
            className={`flex-1 py-2.5 font-extrabold text-xs rounded-xl transition-all shadow-lg ${
              state.danger
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                : "bg-[#d4af37] hover:bg-[#b8860b] text-black shadow-[#d4af37]/10"
            }`}
          >
            {state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
