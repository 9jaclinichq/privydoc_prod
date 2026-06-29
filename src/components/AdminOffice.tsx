import React, { useState } from "react";
import { 
  Building, ShieldAlert, Key, Users, Sparkles, Wallet, 
  ArrowRight, Activity, LogOut, CheckCircle, Clock, Trash,
  Database, Cpu, Layers, Terminal, Zap, Server, Check, Coins, Settings2,
  Megaphone, Send, RefreshCw
} from "lucide-react";
import { doctorApi, adminApi, pricingApi, consultationApi } from "../lib/api";
import { toast } from "./ToastNotification";

interface AdminOfficeProps {
  adminPin: string;
  setAdminPin: (pin: string) => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;
  adminView: "verifications" | "payouts" | "supabase" | "pricing" | "cases" | "broadcast" | "disputes";
  setAdminView: (v: "verifications" | "payouts" | "supabase" | "pricing" | "cases" | "broadcast" | "disputes") => void;
  onAdminLogin: (e: React.FormEvent) => void;
  onAdminVerifyDoctor: (id: string, approve: boolean) => void;
  onAdminApprovePayout: (id: string, approve: boolean) => void;
  formatDate: (d: string) => string;
  formatNaira: (n: number) => string;
  triggerRefresh: () => void;
}

export default function AdminOffice({
  adminPin,
  setAdminPin,
  isAdminAuthenticated,
  setIsAdminAuthenticated,
  adminView,
  setAdminView,
  onAdminLogin,
  onAdminVerifyDoctor,
  onAdminApprovePayout,
  formatDate,
  formatNaira,
  triggerRefresh
}: AdminOfficeProps) {
  
  // Re-fetch ledger items inside context
  const registeredDoctors = doctorApi.getAll();
  const allPayoutRequests = adminApi.getAllPayouts();

  // Local admin subview with syncing
  const [localAdminSubView, setLocalAdminSubView] = useState<"verifications" | "payouts" | "supabase" | "pricing" | "cases" | "broadcast" | "disputes">("verifications");

  // Disputes & Analytics states
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [adminConsultations, setAdminConsultations] = useState<any[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState<boolean>(false);
  const [revenueFilter, setRevenueFilter] = useState<"1D" | "7D" | "1M" | "1Y" | "All">("All");
  
  // Drilldown states
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [selectedConsForDrilldown, setSelectedConsForDrilldown] = useState<any | null>(null);
  
  // Resolution states
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState<string>("");
  const [resolvingError, setResolvingError] = useState<string>("");
  const [isSubmittingResolution, setIsSubmittingResolution] = useState<boolean>(false);

  const fetchDisputesAndConsultations = () => {
    if (!isAdminAuthenticated) return;
    setLoadingDisputes(true);
    
    // Fetch disputes
    fetch("/api/data/disputes", {
      headers: {
        "x-admin-auth": "true"
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setDisputesList(data);
      }
    })
    .catch(e => console.error("Could not fetch disputes:", e));

    // Fetch consultations
    fetch("/api/data/consultations", {
      headers: {
        "x-admin-auth": "true"
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setAdminConsultations(data);
      }
    })
    .catch(e => console.error("Could not fetch admin consultations:", e))
    .finally(() => {
      setLoadingDisputes(false);
    });
  };

  React.useEffect(() => {
    if (isAdminAuthenticated) {
      fetchDisputesAndConsultations();
    }
  }, [isAdminAuthenticated, localAdminSubView]);

  React.useEffect(() => {
    if (adminView) {
      setLocalAdminSubView(adminView as any);
    }
  }, [adminView]);

  // Reassignment states
  const [reassigningCaseId, setReassigningCaseId] = useState<string | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");

  // Broadcast states
  const [broadcastTitle, setBroadcastTitle] = useState<string>("");
  const [broadcastAudience, setBroadcastAudience] = useState<"all" | "doctor" | "patient">("all");
  const [broadcastMessageText, setBroadcastMessageText] = useState<string>("");
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);

  // Pricing states
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingName, setEditingName] = useState("");
  const [editingDesc, setEditingDesc] = useState("");

  const allRates = pricingApi.getAll();

  const handleStartEdit = (rate: any) => {
    setEditingRateId(rate.id);
    setEditingPrice(rate.price);
    setEditingName(rate.name);
    setEditingDesc(rate.description);
  };

  const handleSaveRate = (id: string) => {
    const updatedRates = allRates.map(r => r.id === id ? { ...r, price: editingPrice, name: editingName, description: editingDesc } : r);
    pricingApi.updateAll(updatedRates);
    setEditingRateId(null);
    triggerRefresh();
  };

  // Flagging states
  const [flaggingDocId, setFlaggingDocId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagStatus, setFlagStatus] = useState<"active" | "suspended">("suspended");

  // Substate for Supabase dashboard section
  const [dbSubView, setDbSubView] = useState<"schemas" | "edge" | "cron">("schemas");
  
  // Simulation trigger states for edge functions
  const [simulatedWebhook, setSimulatedWebhook] = useState(false);
  const [simulatedAiParser, setSimulatedAiParser] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<string[]>([
    "INFO: webhook listener online...",
    "INFO: awaiting Flutterwave transaction payloads..."
  ]);
  const [aiLogs, setAiLogs] = useState<string[]>([
    "INFO: semantic parser ready...",
    "INFO: listening for certified intake creation events..."
  ]);

  const triggerWebhookSimulation = () => {
    setSimulatedWebhook(true);
    setWebhookLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] RECEIVED: POST /v1/flutterwave-webhook - signature verified`,
      `[${new Date().toLocaleTimeString()}] LEDGER: verified transaction ₦7,500 for patient portal`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: updated consultation status to 'pending_doctor' and notified registry`
    ]);
    setTimeout(() => setSimulatedWebhook(false), 1200);
  };

  const triggerAiSimulation = () => {
    setSimulatedAiParser(true);
    setAiLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] EVENT: public.consultations insert trigger captured`,
      `[${new Date().toLocaleTimeString()}] GEMINI: calling model alias 'gemini-3.5-flash' for clinical review`,
      `[${new Date().toLocaleTimeString()}] PARSER: created clinical brief, checked contraindications, and synced to row ID`
    ]);
    setTimeout(() => setSimulatedAiParser(false), 1200);
  };

  return (
    <div className="w-full">
      {/* CASE A: ADMIN SECURITY CLEARANCE LOGIN */}
      {!isAdminAuthenticated ? (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-1">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Admin Security Vault
            </h3>
            <p className="text-xs text-zinc-400">
              Enter secure bypass clearance PIN to open administrative offices
            </p>
          </div>

          <form onSubmit={onAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Security Access PIN</label>
              <input 
                required 
                type="password" 
                placeholder="Bypass security PIN code..." 
                value={adminPin} 
                onChange={(e) => setAdminPin(e.target.value)} 
                className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white text-center focus:outline-none focus:border-rose-500 font-mono" 
              />
            </div>
            <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors shadow">
              Authorize Security Access
            </button>
          </form>
        </div>
      ) : (
        /* CASE B: ADMINISTRATIVE DASHBOARD PANELS */
        <div className="space-y-8 animate-fade-in">
          
          {/* Admin Command Header */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-xl">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-rose-500 font-mono font-bold flex items-center gap-1.5">
                Admin Central Office Active
              </span>
              <h3 className="text-xl font-bold text-white mt-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Platform Operations Office
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Authorized administrative clearance level: LEVEL 1.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 items-center">
              <button 
                onClick={() => { setLocalAdminSubView("verifications"); setAdminView("verifications"); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  localAdminSubView === "verifications" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                License Audits ({registeredDoctors.filter(d => !d.verified).length})
              </button>
              <button 
                onClick={() => { setLocalAdminSubView("payouts"); setAdminView("payouts"); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "payouts" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" /> Payouts ({allPayoutRequests.filter(p => p.status === "pending").length})
              </button>
              <button 
                onClick={() => setLocalAdminSubView("cases")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "cases" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-500" /> Clinical Cases
              </button>
              <button 
                onClick={() => setLocalAdminSubView("broadcast")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "broadcast" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-rose-500" /> Broadcast Office
              </button>
              <button 
                onClick={() => { setLocalAdminSubView("supabase"); setAdminView("supabase"); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "supabase" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[#E5C158]" /> Supabase Engine
              </button>
              <button 
                onClick={() => { setLocalAdminSubView("pricing"); setAdminView("pricing"); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "pricing" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-[#E5C158]" /> Pricing Rates
              </button>
              <button 
                onClick={() => setLocalAdminSubView("disputes")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  localAdminSubView === "disputes" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Disputes Escalation ({disputesList.filter(d => d.status === "pending").length})
              </button>
              <button 
                onClick={() => setIsAdminAuthenticated(false)}
                className="p-2 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                title="Disconnect administrative session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* REVENUE & CLINICAL PERFORMANCE BENTO DASHBOARD */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Building className="w-4 h-4 text-[#E5C158]" /> Performance & Revenue Analytics
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Real-time platform financial audit ledger and clinical throughput stats.</p>
              </div>

              {/* Toggle controls */}
              <div className="bg-black border border-zinc-900 rounded-xl p-1 flex gap-1">
                {(["1D", "7D", "1M", "1Y", "All"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setRevenueFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      revenueFilter === f 
                        ? "bg-rose-600 text-white shadow" 
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Gross Evaluation Fees */}
              <div className="bg-black border border-zinc-900 p-5 rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/[0.02] rounded-full filter blur-lg pointer-events-none" />
                <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Gross Clinical Revenue</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">{formatNaira(adminConsultations.filter(c => {
                  if (!c.created_at) return false;
                  const created = new Date(c.created_at);
                  const diffMs = new Date().getTime() - created.getTime();
                  if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                  if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                  return true;
                }).reduce((acc, c) => acc + (Number(c.amount_paid) || 0), 0))}</p>
                <p className="text-[10px] text-zinc-500">Collected diagnostic fees from {adminConsultations.filter(c => {
                  if (!c.created_at) return false;
                  const created = new Date(c.created_at);
                  const diffMs = new Date().getTime() - created.getTime();
                  if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                  if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                  return true;
                }).length} secure intakes.</p>
              </div>

              {/* Card 2: Distributed Earnings */}
              <div className="bg-black border border-zinc-900 p-5 rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/[0.02] rounded-full filter blur-lg pointer-events-none" />
                <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Clinician Payouts (70%)</span>
                <p className="text-2xl font-bold font-mono text-amber-500 mt-1">{formatNaira(Math.round(adminConsultations.filter(c => {
                  if (!c.created_at) return false;
                  const created = new Date(c.created_at);
                  const diffMs = new Date().getTime() - created.getTime();
                  if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                  if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                  return true;
                }).reduce((acc, c) => acc + (Number(c.amount_paid) || 0), 0) * 0.7))}</p>
                <p className="text-[10px] text-zinc-500">Earned commission ledger synchronized to doctors' wallets.</p>
              </div>

              {/* Card 3: Platform Net Fees */}
              <div className="bg-black border border-zinc-900 p-5 rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.02] rounded-full filter blur-lg pointer-events-none" />
                <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Platform Net Surplus (30%)</span>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{formatNaira(adminConsultations.filter(c => {
                  if (!c.created_at) return false;
                  const created = new Date(c.created_at);
                  const diffMs = new Date().getTime() - created.getTime();
                  if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                  if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                  return true;
                }).reduce((acc, c) => acc + (Number(c.amount_paid) || 0), 0) - Math.round(adminConsultations.filter(c => {
                  if (!c.created_at) return false;
                  const created = new Date(c.created_at);
                  const diffMs = new Date().getTime() - created.getTime();
                  if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                  if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                  if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                  return true;
                }).reduce((acc, c) => acc + (Number(c.amount_paid) || 0), 0) * 0.7))}</p>
                <p className="text-[10px] text-zinc-500">Net operations surplus and infrastructure maintenance fees retained.</p>
              </div>
            </div>

            {/* Breakdowns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Stage Breakdown list */}
              <div className="bg-black border border-zinc-900/60 p-5 rounded-xl space-y-3.5 text-xs text-zinc-400">
                <h5 className="font-bold text-white text-xs border-b border-zinc-900 pb-2 flex items-center justify-between">
                  <span>Clinical Lifecycle Stages</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Count</span>
                </h5>
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Intake Submitted / Initial Stage</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "initial").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Day-2 Pending Specialist Response</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "day2_pending").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Day-2 Sent Check-in Messages</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "day2_sent").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Day-5 Pending Care Sign-off</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "day5_pending").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Day-5 Closed / Case Completed</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "day5_closed" || c.status === "completed").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-950">
                    <span className="text-zinc-400">● Active Follow-up Review Open</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "review_open").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-400">● Follow-up Review Resolved</span>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.stage === "review_closed").length}</span>
                  </div>
                </div>
              </div>

              {/* Condition Breakdown list */}
              <div className="bg-black border border-zinc-900/60 p-5 rounded-xl space-y-3.5 text-xs text-zinc-400">
                <h5 className="font-bold text-white text-xs border-b border-zinc-900 pb-2 flex items-center justify-between">
                  <span>Category Medical Pathology Breakdown</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Count</span>
                </h5>
                <div className="space-y-2.5 font-mono">
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                      <span>Erectile Dysfunction (ED)</span>
                    </div>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.condition === "ED").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500/80" />
                      <span>Premature Ejaculation (PE)</span>
                    </div>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.condition === "PE").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500/80" />
                      <span>Sexually Transmitted Infections (STI)</span>
                    </div>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.condition === "STI").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500/80" />
                      <span>Low Sexual Desire (LSD)</span>
                    </div>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.condition === "LSD").length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      <span>General Health Consultation (GHC)</span>
                    </div>
                    <span className="text-white font-bold">{adminConsultations.filter(c => {
                      if (!c.created_at) return false;
                      const created = new Date(c.created_at);
                      const diffMs = new Date().getTime() - created.getTime();
                      if (revenueFilter === "1D") return diffMs <= 24 * 60 * 60 * 1000;
                      if (revenueFilter === "7D") return diffMs <= 7 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1M") return diffMs <= 30 * 24 * 60 * 60 * 1000;
                      if (revenueFilter === "1Y") return diffMs <= 365 * 24 * 60 * 60 * 1000;
                      return true;
                    }).filter(c => c.condition === "GHC").length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {localAdminSubView === "verifications" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                Clinician Registry Audits
              </h4>

              {registeredDoctors.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-4">No registered clinicians inside platform database.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {registeredDoctors.map(doc => (
                    <div key={doc.id} className="p-5 bg-black rounded-xl border border-zinc-900 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h5 className="font-bold text-white text-xs">{doc.name}</h5>
                          <p className="text-[10px] text-zinc-500 font-mono">Folio: {doc.mdcn_folio} • Cycle Yr: {doc.apl_year}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            Unpaid: <span className="text-[#E5C158]">₦{(doc.payout_balance || 0).toLocaleString()}</span> (New: ₦{(doc.unpaid_new || 0).toLocaleString()} • Rev: ₦{(doc.unpaid_review || 0).toLocaleString()})
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">Completed: {doc.total_new || 0} initial • {doc.total_review || 0} review</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest uppercase ${
                            doc.verified ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {doc.verified ? "Verified" : "Pending Audit"}
                          </span>
                          {doc.status === "suspended" && (
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest uppercase bg-rose-500/15 text-rose-400">
                              Suspended
                            </span>
                          )}
                          {doc.flagged && (
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest uppercase bg-amber-500/15 text-amber-400">
                              Warning Flag
                            </span>
                          )}
                        </div>
                      </div>

                      {doc.flagged && (
                        <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-rose-300 block text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Clinical Portfolio Restriction Hold:
                          </span>
                          <p className="text-rose-200/90 text-[11px] leading-relaxed italic">"{doc.flag_reason}"</p>
                        </div>
                      )}

                      {flaggingDocId === doc.id ? (
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Hold/Flag Reason</label>
                            <select
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              className="w-full text-xs bg-black border border-zinc-800 text-white p-2 rounded-lg"
                            >
                              <option value="">-- Choose Preset or Write Below --</option>
                              <option value="Stale MDCN clinical license validation required.">Stale MDCN clinical license validation required.</option>
                              <option value="Suspected platform rule violation / case farming.">Suspected platform rule violation / case farming.</option>
                              <option value="Pending clinical supervisor portfolio review.">Pending clinical supervisor portfolio review.</option>
                              <option value="Failure to respond to active cases within SLA limit.">Failure to respond to active cases within SLA limit.</option>
                              <option value="Incomplete or suboptimal clinical note documentation.">Incomplete or suboptimal clinical note documentation.</option>
                              <option value="Inappropriate medication dosing or prescription safety hold.">Inappropriate medication dosing or prescription safety hold.</option>
                              <option value="Bypassing critical red-flag symptoms without safety explanation.">Bypassing critical red-flag symptoms without safety explanation.</option>
                            </select>
                            <textarea
                              placeholder="Or specify custom clinician warning/suspension reason..."
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              rows={2}
                              className="w-full text-xs bg-black border border-zinc-800 text-white p-2 rounded-lg mt-1.5 focus:outline-none focus:border-zinc-700 font-mono"
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] font-mono uppercase text-zinc-400">Hold Category</span>
                            <div className="flex gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                                <input
                                  type="radio"
                                  name="flag_status"
                                  checked={flagStatus === "active"}
                                  onChange={() => setFlagStatus("active")}
                                  className="accent-amber-500"
                                />
                                Warning Only
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer text-rose-400">
                                <input
                                  type="radio"
                                  name="flag_status"
                                  checked={flagStatus === "suspended"}
                                  onChange={() => setFlagStatus("suspended")}
                                  className="accent-rose-500"
                                />
                                Suspend Account
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => {
                                if (flagReason.trim()) {
                                  adminApi.flagClinician(doc.id, true, flagReason, flagStatus);
                                  setFlaggingDocId(null);
                                  setFlagReason("");
                                  triggerRefresh();
                                }
                              }}
                              disabled={!flagReason.trim()}
                              className="flex-1 py-1.5 bg-[#E5C158] hover:bg-[#d4af37] disabled:opacity-50 text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                            >
                              Apply Hold
                            </button>
                            <button
                              onClick={() => setFlaggingDocId(null)}
                              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-[10.5px] rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 flex flex-col gap-2">
                          <div className="flex gap-2">
                            {!doc.verified ? (
                              <button
                                onClick={() => onAdminVerifyDoctor(doc.id, true)}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                              >
                                Approve & Verify License
                              </button>
                            ) : (
                              <button
                                onClick={() => onAdminVerifyDoctor(doc.id, false)}
                                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10.5px] rounded-lg transition-colors"
                              >
                                Revoke License Verification
                              </button>
                            )}
                          </div>

                          {doc.verified && (
                            <div className="flex gap-2">
                              {doc.flagged || doc.status === "suspended" ? (
                                <button
                                  onClick={() => {
                                    adminApi.flagClinician(doc.id, false, "", "active");
                                    triggerRefresh();
                                  }}
                                  className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 font-bold text-[10.5px] rounded-lg transition-colors"
                                >
                                  Unflag & Reactivate Portfolio
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setFlaggingDocId(doc.id);
                                    setFlagReason("");
                                    setFlagStatus("suspended");
                                  }}
                                  className="flex-1 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 font-bold text-[10.5px] rounded-lg transition-colors"
                                >
                                  Flag / Set Compliance Hold
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW II: PAYOUT SETTLEMENTS LEDGER */}
          {localAdminSubView === "payouts" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                Clinician Commission Payout Ledger
              </h4>

              {allPayoutRequests.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-4">No historical payout settlement submissions.</p>
              ) : (
                <div className="space-y-4">
                  {allPayoutRequests.map(pay => (
                    <div key={pay.id} className="p-4 bg-black rounded-xl border border-zinc-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-white">{pay.doctor_name}</strong>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${
                            pay.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : pay.status === "rejected" ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400 animate-pulse"
                          }`}>
                            {pay.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono">Bank: {pay.bank_name} • Account NUBAN: {pay.account_number}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Submitted: {formatDate(pay.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <strong className="text-[#E5C158] text-sm">{formatNaira(pay.amount)}</strong>
                        
                        {pay.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onAdminApprovePayout(pay.id, true)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                            >
                              Settle Payout
                            </button>
                            <button
                              onClick={() => onAdminApprovePayout(pay.id, false)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10.5px] rounded-lg transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW III: SUPABASE DATABASE & COMPONENT INTEGRATION VIEW */}
          {localAdminSubView === "supabase" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-zinc-900 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Database className="w-4 h-4 text-[#E5C158]" /> Supabase Infrastructure Console
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage table relational schemas, trigger secure Edge Functions, and audit pgcron scheduler events.
                  </p>
                </div>

                {/* Subview Buttons */}
                <div className="flex gap-1.5 bg-black p-1 rounded-xl border border-zinc-900">
                  <button 
                    onClick={() => setDbSubView("schemas")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      dbSubView === "schemas" ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Postgres Schemas
                  </button>
                  <button 
                    onClick={() => setDbSubView("edge")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      dbSubView === "edge" ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Edge Controllers
                  </button>
                  <button 
                    onClick={() => setDbSubView("cron")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      dbSubView === "cron" ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    pg_cron Jobs
                  </button>
                </div>
              </div>

              {/* Sub-View A: PostgreSQL Schema Visualizer */}
              {dbSubView === "schemas" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Patients schema */}
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="font-mono text-xs font-bold text-[#E5C158] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> public.patients
                        </span>
                        <span className="text-[9px] uppercase font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                          RLS Enabled
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <p className="text-zinc-400 flex justify-between"><span>id <strong className="text-zinc-600">UUID (PK)</strong></span> <span className="text-zinc-500 font-bold">DEFAULT gen_random_uuid()</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>phone <strong className="text-zinc-600">TEXT (UNIQUE)</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>email <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NULLABLE</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>first_name <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>pin_hash <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>age_dob <strong className="text-zinc-600">INT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>created_at <strong className="text-zinc-600">TIMESTAMPTZ</strong></span> <span className="text-zinc-500">DEFAULT now()</span></p>
                      </div>
                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-900 text-[9.5px] font-mono text-zinc-500 leading-normal">
                        <strong>RLS POLICY:</strong> "Patients can read and modify exclusively their own records matching verified matching telephone credentials."
                      </div>
                    </div>

                    {/* Consultations schema */}
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="font-mono text-xs font-bold text-[#E5C158] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> public.consultations
                        </span>
                        <span className="text-[9px] uppercase font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                          RLS Enabled
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <p className="text-zinc-400 flex justify-between"><span>id <strong className="text-zinc-600">TEXT (PK)</strong></span> <span className="text-zinc-500 font-bold">NUBAN CASE ID</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>patient_phone <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">REFERENCES patients(phone)</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>doctor_id <strong className="text-zinc-600">UUID</strong></span> <span className="text-zinc-500">REFERENCES doctors(id) NULLABLE</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>status <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">DEFAULT 'pending_payment'</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>condition_id <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>answers <strong className="text-zinc-600">JSONB</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>ai_summary <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NULLABLE</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>prescription <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NULLABLE</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>amount_paid <strong className="text-zinc-600">NUMERIC</strong></span> <span className="text-zinc-500 font-bold">Dynamic Platform Rates</span></p>
                      </div>
                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-900 text-[9.5px] font-mono text-zinc-500 leading-normal">
                        <strong>RLS POLICY:</strong> "Patients can insert. Read access permitted only to owning patient and approved clinicians inside registry."
                      </div>
                    </div>

                    {/* Doctors schema */}
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="font-mono text-xs font-bold text-[#E5C158] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> public.doctors
                        </span>
                        <span className="text-[9px] uppercase font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                          RLS Enabled
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <p className="text-zinc-400 flex justify-between"><span>id <strong className="text-zinc-600">UUID (PK)</strong></span> <span className="text-zinc-500 font-bold">DEFAULT gen_random_uuid()</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>name <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>phone <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>mdcn_folio <strong className="text-zinc-600">TEXT (UNIQUE)</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>apl_year <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>verified <strong className="text-zinc-600">BOOLEAN</strong></span> <span className="text-zinc-500 font-bold">DEFAULT false</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>pin_hash <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                      </div>
                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-900 text-[9.5px] font-mono text-zinc-500 leading-normal">
                        <strong>RLS POLICY:</strong> "Select available to all authenticated. Updates permitted only to own profile. Verification updates restricted to superusers."
                      </div>
                    </div>

                    {/* Messages schema */}
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="font-mono text-xs font-bold text-[#E5C158] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> public.messages
                        </span>
                        <span className="text-[9px] uppercase font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                          RLS Enabled
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <p className="text-zinc-400 flex justify-between"><span>id <strong className="text-zinc-600">UUID (PK)</strong></span> <span className="text-zinc-500">DEFAULT gen_random_uuid()</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>consultation_id <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">REFERENCES consultations(id)</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>sender_role <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500 font-bold">CHECK (role IN ('patient','doctor'))</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>content <strong className="text-zinc-600">TEXT</strong></span> <span className="text-zinc-500">NOT NULL</span></p>
                        <p className="text-zinc-400 flex justify-between"><span>created_at <strong className="text-zinc-600">TIMESTAMPTZ</strong></span> <span className="text-zinc-500">DEFAULT now()</span></p>
                      </div>
                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-900 text-[9.5px] font-mono text-zinc-500 leading-normal">
                        <strong>RLS POLICY:</strong> "Read/write access permitted only to patient or claimed doctor linked directly inside parent consultation row."
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-View B: Supabase Edge Functions */}
              {dbSubView === "edge" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Flutterwave Webhook */}
                    <div className="bg-black p-5 rounded-xl border border-zinc-900 space-y-4">
                      <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                        <div>
                          <h5 className="font-mono font-bold text-xs text-white">fn::flutterwave-webhook</h5>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">TRIGGER: POST /v1/payout-webhook</p>
                        </div>
                        <button
                          onClick={triggerWebhookSimulation}
                          disabled={simulatedWebhook}
                          className="px-3 py-1 bg-amber-600 hover:bg-[#d4af37] text-black font-extrabold font-mono text-[9.5px] rounded transition-all disabled:opacity-50"
                        >
                          {simulatedWebhook ? "Simulating..." : "Trigger Test Webhook"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Receives background payment confirmations from Flutterwave. Validates HMAC signature hashes using <code className="text-[#E5C158] bg-zinc-900 px-1 py-0.5 rounded text-[10px]">FLW_SECRET_HASH</code>, captures incoming NGN credits, and promotes consultations to clinician claim queues.
                        </p>
                        
                        <div className="bg-zinc-950 rounded border border-zinc-900 p-3.5 space-y-1.5 h-36 overflow-y-auto font-mono text-[10px] text-zinc-500">
                          {webhookLogs.map((log, i) => (
                            <p key={i} className={log.includes("SUCCESS") ? "text-emerald-400" : log.includes("RECEIVED") ? "text-[#E5C158]" : ""}>{log}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gemini AI Summary Parser */}
                    <div className="bg-black p-5 rounded-xl border border-zinc-900 space-y-4">
                      <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                        <div>
                          <h5 className="font-mono font-bold text-xs text-white">fn::gemini-diagnosis-brief</h5>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">TRIGGER: public.consultations.status = 'pending_doctor'</p>
                        </div>
                        <button
                          onClick={triggerAiSimulation}
                          disabled={simulatedAiParser}
                          className="px-3 py-1 bg-amber-600 hover:bg-[#d4af37] text-black font-extrabold font-mono text-[9.5px] rounded transition-all disabled:opacity-50"
                        >
                          {simulatedAiParser ? "Analyzing..." : "Trigger AI Parser"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Secure server-side cloud model parser. Extracts patient symptoms, triggers safety filters, detects potential nitrate contraindications, and structures clinical diagnostic briefs automatically inside the consult file.
                        </p>
                        
                        <div className="bg-zinc-950 rounded border border-zinc-900 p-3.5 space-y-1.5 h-36 overflow-y-auto font-mono text-[10px] text-zinc-500">
                          {aiLogs.map((log, i) => (
                            <p key={i} className={log.includes("GEMINI") ? "text-amber-400" : log.includes("PARSER") ? "text-emerald-400" : ""}>{log}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-View C: PostgreSQL pg_cron Schedules */}
              {dbSubView === "cron" && (
                <div className="space-y-4">
                  <div className="p-4 bg-black rounded-xl border border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E5C158] text-xs">cron::payout_balance_consolidation</span>
                        <code className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono">0 0 * * *</code>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Executes nightly database audits. Resolves completed doctor files, aggregates platform commission structures, and generates pending payout items inside <code className="text-[#E5C158]">public.payout_requests</code>.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded">
                      ACTIVE (Midnight UTC)
                    </span>
                  </div>

                  <div className="p-4 bg-black rounded-xl border border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E5C158] text-xs">cron::stale_cases_escalation</span>
                        <code className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono">0 */3 * * *</code>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Performs diagnostic safety sweep. Scans for patient intake folders remaining inside claim queues for more than 12 hours without clinician assignment, generating emergency routing flags.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded">
                      ACTIVE (Every 3 Hrs)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW IV: PRICING RATES PANEL */}
          {localAdminSubView === "pricing" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-zinc-900 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Coins className="w-4 h-4 text-[#E5C158]" /> Centralized Platform Rates Console
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage service prices across the entire platform in real time. Changes propagate immediately to checkout, portals, invoices, and reports.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {allRates.map((rate) => (
                  <div key={rate.id} className="p-5 bg-black rounded-xl border border-zinc-900 space-y-4 hover:border-zinc-800 transition-all">
                    {editingRateId === rate.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Category Title</label>
                            <input 
                              type="text" 
                              value={editingName} 
                              onChange={(e) => setEditingName(e.target.value)} 
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Standard Price (₦)</label>
                            <input 
                              type="number" 
                              value={editingPrice} 
                              onChange={(e) => setEditingPrice(Math.max(0, parseInt(e.target.value) || 0))} 
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Category Description</label>
                          <textarea 
                            value={editingDesc} 
                            onChange={(e) => setEditingDesc(e.target.value)} 
                            rows={2}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/40">
                          <button 
                            type="button" 
                            onClick={() => setEditingRateId(null)}
                            className="px-3.5 py-1.5 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleSaveRate(rate.id)}
                            className="px-4 py-1.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white text-xs">{rate.name}</h5>
                            <span className="text-[8px] font-mono bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded uppercase border border-zinc-800">
                              {rate.id}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{rate.description}</p>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end gap-3 sm:gap-2 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">PLATFORM RATE</span>
                            <strong className="text-sm font-extrabold text-[#E5C158] font-mono">{formatNaira(rate.price)}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(rate)}
                            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg text-[10.5px] font-mono font-bold uppercase transition-all flex items-center gap-1"
                          >
                            <Settings2 className="w-3.5 h-3.5 text-[#E5C158]" /> Adjust
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* VIEW V: CLINICAL CASES MANAGEMENT & REASSIGNMENT */}
          {localAdminSubView === "cases" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <RefreshCw className="w-4 h-4 text-rose-500" /> Clinical Case Flow & Reassignments
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Audit active patient files, manage clinical workloads, and reassign or route cases back to the claim pool.
                </p>
              </div>

              {consultationApi.getAll().filter(c => c.status !== "completed").length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-4">No active clinical cases found inside platform registry.</p>
              ) : (
                <div className="space-y-4">
                  {consultationApi.getAll()
                    .filter(c => c.status !== "completed")
                    .map(cons => {
                      const isReassigning = reassigningCaseId === cons.id;
                      return (
                        <div key={cons.id} className="p-5 bg-black rounded-xl border border-zinc-900 space-y-4 hover:border-zinc-800 transition-all">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{cons.patient_name} ({cons.patient_age} yrs)</span>
                                <span className="text-[8.5px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded uppercase border border-zinc-800">
                                  {cons.id}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${
                                  cons.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-900/30" : "bg-blue-500/10 text-blue-400 border border-blue-900/30"
                                }`}>
                                  {cons.status}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400">Condition: <strong className="text-[#E5C158]">{cons.condition}</strong></p>
                              <p className="text-[10px] text-zinc-500 font-mono">Stage: {cons.stage || "initial"} • Created: {formatDate(cons.created_at)}</p>
                              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-1">
                                <span>Assigned Clinician:</span>
                                {cons.doctor_name ? (
                                  <span className="text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                                    Dr. {cons.doctor_name}
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-bold bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded">
                                    Unassigned / Open Pool
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isReassigning && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassigningCaseId(cons.id);
                                  setTargetDoctorId(cons.doctor_id || "");
                                  setReassignReason("");
                                }}
                                className="sm:self-center px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                              >
                                Reassign Case
                              </button>
                            )}
                          </div>

                          {isReassigning && (
                            <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 space-y-4 animate-fade-in">
                              <h5 className="text-xs font-bold text-white font-mono uppercase">Reassignment Controller</h5>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">
                                    Select Target Clinician
                                  </label>
                                  <select
                                    value={targetDoctorId}
                                    onChange={(e) => setTargetDoctorId(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                  >
                                    <option value="">Return to Claim Pool (Unassigned / Return to Pool)</option>
                                    {registeredDoctors
                                      .filter(d => d.verified && d.status === "active" && d.id !== cons.doctor_id)
                                      .map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                          Dr. {doc.name} (Folio: {doc.mdcn_folio})
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">
                                    Reassignment Reason (Mandatory)
                                  </label>
                                  <select
                                    value={reassignReason}
                                    onChange={(e) => setReassignReason(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                  >
                                    <option value="">-- Choose Reason Preset or Type Below --</option>
                                    <option value="Previous doctor failed to respond within clinical SLA window">Previous doctor failed to respond within clinical SLA window</option>
                                    <option value="Doctor requested portfolio transfer due to caseload workload">Doctor requested portfolio transfer due to caseload workload</option>
                                    <option value="Administrative override due to specialized symptoms">Administrative override due to specialized symptoms</option>
                                    <option value="Platform routing optimization audit sweep">Platform routing optimization audit sweep</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Custom Reason Remarks</label>
                                <textarea
                                  placeholder="Specify specific reasons for the reassignment audit log..."
                                  value={reassignReason}
                                  onChange={(e) => setReassignReason(e.target.value)}
                                  rows={2}
                                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/40">
                                <button
                                  type="button"
                                  onClick={() => setReassigningCaseId(null)}
                                  className="px-3.5 py-1.5 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={!reassignReason.trim()}
                                  onClick={() => {
                                    const success = adminApi.reassignCase(cons.id, targetDoctorId === "" ? null : targetDoctorId, reassignReason);
                                    if (success) {
                                      setReassigningCaseId(null);
                                      setTargetDoctorId("");
                                      setReassignReason("");
                                      triggerRefresh();
                                    }
                                  }}
                                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5"
                                >
                                  Confirm Reassignment
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* VIEW VI: BROADCAST OFFICE */}
          {localAdminSubView === "broadcast" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Megaphone className="w-4 h-4 text-rose-500" /> Platform Communication Broadcasts
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Dispatch priority alerts, maintenance announcements, or policy updates to doctor portfolios, patient accounts, or all platform participants.
                </p>
              </div>

              {broadcastSuccess && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-400 space-y-1 animate-fade-in">
                  <strong className="block text-[11px] font-bold">Broadcast Dispatched Successfully!</strong>
                  <p className="text-[10px] text-emerald-300">
                    The priority alert has been injected into targeted inbox profiles and registered to the immutable system audit trail.
                  </p>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (broadcastTitle.trim() && broadcastMessageText.trim()) {
                    adminApi.broadcastMessage(broadcastAudience, broadcastTitle, broadcastMessageText);
                    setBroadcastSuccess(true);
                    setBroadcastTitle("");
                    setBroadcastMessageText("");
                    triggerRefresh();
                    setTimeout(() => setBroadcastSuccess(false), 5000);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Target Audience Group</label>
                    <select
                      value={broadcastAudience}
                      onChange={(e) => setBroadcastAudience(e.target.value as any)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="all">All Platform Users (Doctors & Patients)</option>
                      <option value="doctor">Clinicians Only (Verified & Pending Doctors)</option>
                      <option value="patient">Patients Only (Registered Profiles)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Broadcast Subject / Title</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Scheduled System Security Upgrades"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Communication Content Body</label>
                  <textarea
                    required
                    placeholder="Enter details of your message. This will immediately push in-app notifications to selected recipients."
                    value={broadcastMessageText}
                    onChange={(e) => setBroadcastMessageText(e.target.value)}
                    rows={5}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors shadow flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Dispatch Priority Broadcast
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW VII: DISPUTES ESCALATION QUEUE */}
          {localAdminSubView === "disputes" && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <ShieldAlert className="w-4 h-4 text-rose-500" /> Administrative Disputes Escalation Desk
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Audit grievances lodged by patients, inspect clinician transcripts/prescriptions, and issue final resolutions.
                  </p>
                </div>
                <button
                  onClick={fetchDisputesAndConsultations}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase font-mono rounded-xl transition-all"
                >
                  Sync Desk
                </button>
              </div>

              {loadingDisputes ? (
                <p className="text-xs text-zinc-500 italic py-8 text-center animate-pulse">Syncing disputes data with secure database...</p>
              ) : disputesList.length === 0 ? (
                <div className="p-8 bg-black rounded-xl border border-zinc-900 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h5 className="font-bold text-zinc-400 text-xs">Administrative Disputes Queue is Clear</h5>
                  <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    No active clinical grievances or payment disputes are pending review on the platform registry.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputesList.map(disp => {
                    const matchedCons = adminConsultations.find(c => c.id === disp.consultation_id);
                    return (
                      <div key={disp.id} className="p-5 bg-black rounded-xl border border-zinc-900/80 space-y-4 text-xs text-zinc-400 text-left">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono font-bold text-xs">ID: {disp.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-extrabold ${
                                disp.status === "resolved" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/30" 
                                  : "bg-amber-500/10 text-amber-400 border border-amber-900/30 animate-pulse"
                              }`}>
                                {disp.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500">Escalated: {formatDate(disp.created_at)} • Consultation File: {disp.consultation_id}</p>
                            <p className="text-[10px] text-zinc-500">Patient Phone: {disp.patient_phone}</p>
                          </div>

                          <div className="flex gap-2">
                            {/* Drilldown trigger */}
                            <button
                              onClick={() => {
                                setSelectedDispute(disp);
                                setSelectedConsForDrilldown(matchedCons || null);
                              }}
                              className="px-3 py-1.5 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              Audit Case File
                            </button>

                            {/* Resolve trigger */}
                            {disp.status !== "resolved" && (
                              <button
                                onClick={() => {
                                  setResolvingDisputeId(disp.id);
                                  setResolutionText("");
                                  setResolvingError("");
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] transition-all"
                              >
                                Issue Resolution
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-900 text-zinc-300 space-y-1">
                          <p className="text-[10px] uppercase font-mono text-zinc-500 font-bold tracking-wider">Lodged Grievance Reason</p>
                          <p className="leading-relaxed font-sans">{disp.reason}</p>
                        </div>

                        {disp.resolution_details && (
                          <div className="p-3.5 bg-emerald-950/10 rounded-lg border border-emerald-900/30 text-emerald-300 space-y-1">
                            <p className="text-[10px] uppercase font-mono text-emerald-500 font-bold tracking-wider">Official Resolution Action</p>
                            <p className="leading-relaxed font-sans">{disp.resolution_details}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RESOLUTION MODAL */}
              {resolvingDisputeId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-left">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Issue Administrative Resolution
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Record final corrective administrative action. This dispute will be marked as resolved, and an immutable audit entry will be cataloged.
                      </p>
                    </div>

                    {resolvingError && (
                      <p className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[10px] text-rose-400 font-mono">
                        {resolvingError}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Administrative Correction Details (Mandatory)</label>
                      <textarea
                        required
                        placeholder="Detail the resolution actions (e.g. issued full refund, reassigned clinician, warning issued)..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        rows={4}
                        className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/40">
                      <button
                        type="button"
                        onClick={() => { setResolvingDisputeId(null); setResolvingError(""); }}
                        className="px-3.5 py-1.5 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!resolutionText.trim() || isSubmittingResolution}
                        onClick={async () => {
                          setIsSubmittingResolution(true);
                          setResolvingError("");
                          try {
                            const response = await fetch(`/api/data/disputes?id=eq.${resolvingDisputeId}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                "x-admin-auth": "true"
                              },
                              body: JSON.stringify({
                                status: "resolved",
                                resolution_details: resolutionText,
                                resolved_at: new Date().toISOString()
                              })
                            });
                            if (!response.ok) {
                              const errorData = await response.json();
                              setResolvingError(errorData.message || "Failed to submit resolution.");
                            } else {
                              // Log audit log for dispute_resolved
                              const dispute = disputesList.find(d => d.id === resolvingDisputeId);
                              await fetch("/api/data/audit_log", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "x-admin-auth": "true"
                                },
                                body: JSON.stringify({
                                  id: "aud_" + Math.random().toString(36).substr(2, 9),
                                  action: "dispute_resolved",
                                  actor_type: "admin",
                                  actor_id: "admin_clearance",
                                  target_type: "dispute",
                                  target_id: resolvingDisputeId,
                                  detail: `Admin resolved dispute ID ${resolvingDisputeId} for consultation ${dispute?.consultation_id || "unknown"}. Action: ${resolutionText}`,
                                  created_at: new Date().toISOString()
                                })
                              }).catch(e => console.error("Could not write resolution audit log:", e));

                              setResolvingDisputeId(null);
                              fetchDisputesAndConsultations();
                              toast.success("Dispute marked resolved and audit log registered successfully.");
                            }
                          } catch (err) {
                            setResolvingError("Could not establish connection with secure servers.");
                          } finally {
                            setIsSubmittingResolution(false);
                          }
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs transition-all"
                      >
                        {isSubmittingResolution ? "Submitting..." : "Complete Resolution"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIT DRILLDOWN DRAWER/MODAL */}
              {selectedDispute && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-end">
                  <div className="bg-zinc-950 border-l border-zinc-900 w-full max-w-2xl h-full p-8 flex flex-col justify-between overflow-y-auto space-y-6 shadow-2xl animate-slide-left text-left">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start border-b border-zinc-900 pb-4">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-rose-500 font-mono font-bold">CASE AUDIT DRILL-DOWN</span>
                          <h4 className="text-base font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Clinical File Audit: {selectedDispute.consultation_id}
                          </h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Reviewing full digital registry history for grievance ID {selectedDispute.id}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedDispute(null); setSelectedConsForDrilldown(null); }}
                          className="px-3.5 py-1.5 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Close Audit Panel
                        </button>
                      </div>

                      {selectedConsForDrilldown ? (
                        <div className="space-y-6 text-xs text-zinc-300">
                          {/* Section A: Intake answers */}
                          <div className="space-y-2 bg-black border border-zinc-900 p-4 rounded-xl">
                            <h5 className="font-bold text-white uppercase text-[10px] tracking-wider font-mono border-b border-zinc-900 pb-2">
                              Intake Questionnaire (Symptoms Summary)
                            </h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {Array.isArray(selectedConsForDrilldown.raw_answers) ? (
                                selectedConsForDrilldown.raw_answers.map((ans: any, i: number) => (
                                  <div key={i} className="border-b border-zinc-950 pb-2 text-left">
                                    <span className="text-zinc-500 block font-mono text-[9px]">{ans.question}</span>
                                    <span className="text-zinc-300 mt-0.5 block">{ans.answer}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="italic text-zinc-500">No raw answers available.</p>
                              )}
                            </div>
                          </div>

                          {/* Section B: Message Transcripts */}
                          <div className="space-y-2 bg-black border border-zinc-900 p-4 rounded-xl">
                            <h5 className="font-bold text-white uppercase text-[10px] tracking-wider font-mono border-b border-zinc-900 pb-2">
                              Medical Secure Dialogue Transcripts
                            </h5>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                              {Array.isArray(selectedConsForDrilldown.messages) && selectedConsForDrilldown.messages.length > 0 ? (
                                selectedConsForDrilldown.messages.map((msg: any, i: number) => (
                                  <div key={i} className={`p-2.5 rounded-lg ${msg.sender === "patient" ? "bg-zinc-900/50 border border-zinc-900 text-left" : "bg-rose-950/10 border border-rose-900/10 text-left"}`}>
                                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono mb-1">
                                      <span className="uppercase font-bold text-zinc-400">{msg.sender_name} ({msg.sender})</span>
                                      <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : "N/A"}</span>
                                    </div>
                                    <p className="leading-relaxed font-sans text-zinc-200">{msg.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="italic text-zinc-500">No chat history found.</p>
                              )}
                            </div>
                          </div>

                          {/* Section C: Doctor assessment details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black border border-zinc-900 p-4 rounded-xl space-y-1.5 text-left">
                              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">Doctor Notes</span>
                              <p className="text-zinc-300 leading-relaxed font-sans bg-zinc-950 p-2.5 rounded border border-zinc-900 min-h-[80px] max-h-[140px] overflow-y-auto">
                                {selectedConsForDrilldown.doctor_notes || "No notes recorded."}
                              </p>
                            </div>
                            <div className="bg-black border border-zinc-900 p-4 rounded-xl space-y-1.5 text-left">
                              <span className="text-[9px] uppercase font-mono tracking-widest text-[#E5C158] font-bold block">Prescription Signed</span>
                              <p className="text-zinc-300 leading-relaxed font-mono bg-zinc-950 p-2.5 rounded border border-zinc-900 min-h-[80px] max-h-[140px] overflow-y-auto font-mono">
                                {selectedConsForDrilldown.prescription || "No prescription issued."}
                              </p>
                            </div>
                          </div>

                          {/* Section D: AI Summary (If exists) */}
                          {selectedConsForDrilldown.ai_summary && (
                            <div className="space-y-2 bg-black border border-zinc-900 p-4 rounded-xl text-left">
                              <h5 className="font-bold text-[#E5C158] uppercase text-[10px] tracking-wider font-mono border-b border-zinc-900 pb-2">
                                AI Summary & Clinical Risk Sweep Profile
                              </h5>
                              <p className="leading-relaxed whitespace-pre-wrap bg-zinc-950 p-3 rounded border border-zinc-900/60 font-sans text-[11px] text-zinc-400 max-h-40 overflow-y-auto">
                                {selectedConsForDrilldown.ai_summary}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-2">
                          <p className="text-xs text-rose-400 font-bold">Clinical Case Row Missing</p>
                          <p className="text-[11px] text-zinc-500">Could not retrieve matching file in database index. Audit with supervisor.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
