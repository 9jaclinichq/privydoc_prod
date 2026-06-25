import React, { useState } from "react";
import { 
  Building, ShieldAlert, Key, Users, Sparkles, Wallet, 
  ArrowRight, Activity, LogOut, CheckCircle, Clock, Trash,
  Database, Cpu, Layers, Terminal, Zap, Server, Check, Coins, Settings2
} from "lucide-react";
import { doctorApi, adminApi, pricingApi } from "../lib/api";

interface AdminOfficeProps {
  adminPin: string;
  setAdminPin: (pin: string) => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;
  adminView: "verifications" | "payouts" | "supabase" | "pricing";
  setAdminView: (v: "verifications" | "payouts" | "supabase" | "pricing") => void;
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
                onClick={() => setAdminView("verifications")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminView === "verifications" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                License Audits ({registeredDoctors.filter(d => !d.verified).length})
              </button>
              <button 
                onClick={() => setAdminView("payouts")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminView === "payouts" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" /> Payouts ({allPayoutRequests.filter(p => p.status === "pending").length})
              </button>
              <button 
                onClick={() => setAdminView("supabase")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminView === "supabase" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[#E5C158]" /> Supabase Engine
              </button>
              <button 
                onClick={() => setAdminView("pricing")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminView === "pricing" ? "bg-rose-600 text-white" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-[#E5C158]" /> Pricing Rates
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

          {/* VIEW I: DOCTOR LICENSING & REGISTRY AUDITS */}
          {adminView === "verifications" && (
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
                        <div>
                          <h5 className="font-bold text-white text-xs">{doc.name}</h5>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Folio: {doc.mdcn_folio} • Cycle Yr: {doc.apl_year}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest uppercase ${
                          doc.verified ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {doc.verified ? "Verified" : "Pending Audit"}
                        </span>
                      </div>

                      <div className="pt-2 flex gap-2">
                        {!doc.verified ? (
                          <button
                            onClick={() => onAdminVerifyDoctor(doc.id, true)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                          >
                            Approve License & Verify Doctor
                          </button>
                        ) : (
                          <button
                            onClick={() => onAdminVerifyDoctor(doc.id, false)}
                            className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10.5px] rounded-lg transition-colors"
                          >
                            Revoke/Suspend Verification
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW II: PAYOUT SETTLEMENTS LEDGER */}
          {adminView === "payouts" && (
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
          {adminView === "supabase" && (
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
          {adminView === "pricing" && (
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

        </div>
      )}
    </div>
  );
}
