import React, { Component, ErrorInfo, ReactNode } from "react";
import Logo from "./Logo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-[#e4e4e7] flex flex-col justify-center items-center px-6 py-12 selection:bg-[#d4af37]/40 selection:text-white font-sans antialiased">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
            
            <div className="flex justify-center mb-4">
              <Logo className="h-10 opacity-80" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Vault Safety Intercepted
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                An unexpected security or rendering issue has occurred. For your clinical data confidentiality, this session has been locked.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-red-950/15 border border-red-900/20 rounded-xl text-left">
                <p className="text-[10px] font-mono text-red-400 break-words leading-relaxed">
                  Error: {this.state.error.message || "Unknown rendering exception"}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
              >
                Reload Secure Vault
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("privydoc_patient_session");
                  window.location.href = "/";
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-bold text-xs rounded-xl transition-all"
              >
                Clear Session & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
