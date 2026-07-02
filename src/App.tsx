import React, { useState, useEffect, useRef } from "react";
import { Shield, Activity, Lock, Users, Laptop, Sparkles, ArrowLeft, HelpCircle, Info, Bell, MapPin, ChevronUp, ChevronDown, Menu, X, LogOut, Inbox, FileText, MessageSquare, PlusCircle, ListChecks, Wallet, LifeBuoy, LayoutDashboard, Stethoscope, ShieldCheck, Settings2, CreditCard } from "lucide-react";
import { Doctor, Consultation, Patient } from "./types";
import { doctorApi, consultationApi, adminApi, patientApi, pricingApi } from "./lib/api";
import { MEN_HEALTH_CONDITIONS } from "./data";
import { INTAKE_QUESTIONS_BANK } from "./data/intakeQuestions";
import { formatNaira, formatDate } from "./utils";

// Custom Sub-Components
import Logo from "./components/Logo";
import PatientLanding from "./components/PatientLanding";
import SymptomChecker from "./components/SymptomChecker";
import IntakeForm from "./components/IntakeForm";
import PatientPortal from "./components/PatientPortal";
import { validateTemplatePlaceholders } from "./templates";
import { ToastContainer, toast } from "./components/ToastNotification";
import { ConfirmModal, confirm } from "./components/ConfirmModal";
import NotificationPanel, { AppNotification } from "./components/NotificationPanel";

const ClinicianArea = React.lazy(() => import("./components/ClinicianArea"));
const AdminOffice = React.lazy(() => import("./components/AdminOffice"));

function normPhone(phone: string): string {
  if (!phone) return "";
  let sanitized = phone.replace(/[\s\-\(\)\+]/g, "");
  if (sanitized.startsWith("0")) sanitized = "234" + sanitized.slice(1);
  if (sanitized.startsWith("2340")) sanitized = "234" + sanitized.slice(4);
  if (sanitized.length === 10 && /^[789]\d{9}$/.test(sanitized)) sanitized = "234" + sanitized;
  return sanitized;
}

export default function App() {
  // Navigation / Role selection states
  const [activeTab, setActiveTab] = useState<"patient" | "clinician" | "admin">("patient");
  const [patientSubView, setPatientSubView] = useState<"landing" | "register" | "otp" | "pinSetup" | "login" | "symptom" | "intake" | "portal">("landing");

  // Compliance and Alert Pre-Permissions states
  const [permissionModal, setPermissionModal] = useState<"location" | null>(null);
  const [pendingCondition, setPendingCondition] = useState<typeof MEN_HEALTH_CONDITIONS[0] | null>(null);
  const [skipWelcomeBack, setSkipWelcomeBack] = useState(false);
  const [geoCheckState, setGeoCheckState] = useState<"ask" | "outside">("ask");

  // Patient session / authentication states
  const [patientSession, setPatientSession] = useState<Patient | null>(() => {
    try {
      const saved = localStorage.getItem("privydoc_patient_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse patient session from localStorage", e);
      return null;
    }
  });

  // Patient registration / login temporary state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regState, setRegState] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regConsent, setRegConsent] = useState(false);
  const [regOtp, setRegOtp] = useState("");
  const [otpChannel, setOtpChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");

  // Patient secure PIN recovery/forgot states
  const [patientForgotMode, setPatientForgotMode] = useState<"none" | "phone" | "verify">("none");
  const [patientForgotPhone, setPatientForgotPhone] = useState("");
  const [patientForgotOtp, setPatientForgotOtp] = useState("");
  const [patientForgotNewPin, setPatientForgotNewPin] = useState("");
  const [patientForgotNewPinConfirm, setPatientForgotNewPinConfirm] = useState("");
  const [isPatientForgotSending, setIsPatientForgotSending] = useState(false);

  const [legalModalOpen, setLegalModalOpen] = useState<"privacy" | "terms" | "medical" | "ndpr" | "refund" | null>(null);

  // Patient states
  const [selectedCondition, setSelectedCondition] = useState<typeof MEN_HEALTH_CONDITIONS[0] | null>(null);
  const [symptomAnswers, setSymptomAnswers] = useState<Record<string, string>>({});
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedCase, setSelectedCase] = useState<Consultation | null>(() => {
    try {
      const saved = localStorage.getItem("privydoc_patient_session");
      if (saved) {
        const patient = JSON.parse(saved);
        const cases = consultationApi.getByPatientPhone(patient.phone);
        return cases.length > 0 ? cases[0] : null;
      }
    } catch (e) {
      console.error("Failed to parse patient session for selectedCase initialization", e);
    }
    return null;
  });
  const [patientMessage, setPatientMessage] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "success" | "red_flag">("form");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("bank");
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // PWA deferredPrompt and showPwaBanner states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  // In-app notification bell states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Clinician states
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(() => {
    try {
      const saved = localStorage.getItem("privydoc_doctor_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse clinician session from localStorage", e);
      return null;
    }
  });
  const [docView, setDocView] = useState<"login" | "cases" | "wallet">("cases");
  const [doctorOnlineStatus, setDoctorOnlineStatus] = useState<"online" | "away">("online");
  const [docFolio, setDocFolio] = useState("");
  const [docPin, setDocPin] = useState("");
  const [docRegName, setDocRegName] = useState("");
  const [docRegPhone, setDocRegPhone] = useState("");
  const [docRegFolio, setDocRegFolio] = useState("");
  const [docRegAplYear, setDocRegAplYear] = useState("2026");
  const [docRegPin, setDocRegPin] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");
  const [selectedDoctorCase, setSelectedDoctorCase] = useState<Consultation | null>(null);
  const [doctorMessage, setDoctorMessage] = useState("");
  
  // AI assistant states for clinician
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Closing case & prescribing
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPrescription, setClosingPrescription] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Clinician payout states
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutBank, setPayoutBank] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutMsg, setPayoutMsg] = useState({ type: "", text: "" });

  // Admin states
  const [adminPin, setAdminPin] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("privydoc_admin_token");
  });
  const [adminView, setAdminView] = useState<"verifications" | "payouts" | "supabase" | "pricing" | "cases" | "broadcast" | "disputes">("verifications");

  // Lifted patient portal sidebar tab (drives PatientPortal's content area from the app shell)
  const [patientPortalTab, setPatientPortalTab] = useState<"dashboard" | "cases" | "messages" | "reports" | "newCase" | "profile">("dashboard");

  // Responsive layout breakpoints
  const [viewportWidth, setViewportWidth] = useState<number>(() => typeof window !== "undefined" ? window.innerWidth : 1024);
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isDesktop = viewportWidth >= 1024;
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Inactivity & Success Screen Countdown states
  const [isPatientSessionLocked, setIsPatientSessionLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [successCountdown, setSuccessCountdown] = useState(5);

  // Refresh lists helper
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Floating Navigation Scroll States
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-refresh cases and doctor status from storage
  useEffect(() => {
    if (currentDoctor) {
      const updatedDoc = doctorApi.getById(currentDoctor.id);
      if (updatedDoc) {
        setCurrentDoctor(updatedDoc);
      }
    }
  }, [refreshTrigger]);

  // Synchronize doctor session with localStorage
  useEffect(() => {
    if (currentDoctor) {
      localStorage.setItem("privydoc_doctor_session", JSON.stringify(currentDoctor));
    } else {
      localStorage.removeItem("privydoc_doctor_session");
    }
  }, [currentDoctor]);

  // Synchronize admin session with localStorage
  useEffect(() => {
    if (isAdminAuthenticated) {
      localStorage.setItem("privydoc_admin_session", "true");
      localStorage.setItem("privydoc_current_admin", "true");
    } else {
      localStorage.removeItem("privydoc_admin_session");
      localStorage.removeItem("privydoc_current_admin");
      localStorage.removeItem("privydoc_admin_token");
    }
  }, [isAdminAuthenticated]);

  // Scroll to top on view or tab transition to ensure pages land fully scrolled up
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, patientSubView]);

  // Routing on mount & priority checks
  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (hash === "#admin" || path === "/admin") {
      setActiveTab("admin");
    } else if (path === "/doctor" || hash === "#doctor" || hash === "#clinician") {
      setActiveTab("clinician");
    } else {
      // Priority: admin > doctor > patient
      const adminSessionSaved = !!localStorage.getItem("privydoc_admin_token");
      const doctorSessionSaved = localStorage.getItem("privydoc_doctor_session");
      const patientSessionSaved = localStorage.getItem("privydoc_patient_session");

      if (adminSessionSaved) {
        setActiveTab("admin");
      } else if (doctorSessionSaved) {
        setActiveTab("clinician");
      } else if (patientSessionSaved) {
        setActiveTab("patient");
      }
    }
  }, []);

  // Hidden admin route: navigating to #admin (even after initial mount) reveals the admin login
  useEffect(() => {
    function checkHashRoute() {
      const hash = window.location.hash;
      if (hash === "#admin") {
        history.replaceState(null, "", window.location.pathname);
        setActiveTab("admin");
      }
    }
    checkHashRoute();
    window.addEventListener("hashchange", checkHashRoute);
    return () => window.removeEventListener("hashchange", checkHashRoute);
  }, []);

  // Restore pending payment if any on app mount
  useEffect(() => {
    const savedPending = localStorage.getItem("privydoc_pending_payment");
    const patientSessionSaved = localStorage.getItem("privydoc_patient_session");
    if (savedPending && patientSessionSaved) {
      try {
        const pending = JSON.parse(savedPending);
        const cond = MEN_HEALTH_CONDITIONS.find(c => c.id === pending.selectedConditionId);
        if (cond) {
          setSelectedCondition(cond);
          setPatientName(pending.patientName || "");
          setPatientAge(pending.patientAge || "");
          setPatientPhone(pending.patientPhone || "");
          setPatientEmail(pending.patientEmail || "");
          setIntakeAnswers(pending.intakeAnswers || {});
          if (pending.paymentMethod) setPaymentMethod(pending.paymentMethod);
          setCheckoutStep("payment");
          setPatientSubView("intake");
          setActiveTab("patient");
        }
      } catch (e) {
        console.error("Failed to restore pending payment state:", e);
      }
    }
  }, []);

  // PWA Custom Install Prompt Banner Logic
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setShowPwaBanner(false);
      return;
    }

    const checkShowBanner = async () => {
      let shouldShow = true;

      // Check last dismissal
      const dismissedTimeStr = localStorage.getItem("privydoc_pwa_dismissed");
      if (dismissedTimeStr) {
        const dismissedTime = parseInt(dismissedTimeStr, 10);
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - dismissedTime < sevenDaysMs) {
          shouldShow = false;
        }
      }

      // Check previously installed and now uninstalled (via getInstalledRelatedApps)
      const isTopLevel = window.self === window.top;
      if (isTopLevel && "getInstalledRelatedApps" in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          const isCurrentlyInstalled = relatedApps && relatedApps.length > 0;
          if (isCurrentlyInstalled) {
            localStorage.setItem("privydoc_pwa_previously_installed", "true");
            shouldShow = false; // already installed, don't show prompt
          } else {
            const previouslyInstalled = localStorage.getItem("privydoc_pwa_previously_installed") === "true";
            if (previouslyInstalled) {
              // Override dismissal to re-show if uninstalled!
              shouldShow = true;
            }
          }
        } catch (e) {
          console.warn("Gracefully handled check for installed related apps:", e);
        }
      }

      // We only show banner if we have captured the installation prompt event!
      if (shouldShow && deferredPrompt) {
        setShowPwaBanner(true);
      } else {
        setShowPwaBanner(false);
      }
    };

    checkShowBanner();
  }, [deferredPrompt]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent browser default installation banner
      e.preventDefault();
      // Store the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      localStorage.setItem("privydoc_pwa_previously_installed", "true");
      setDeferredPrompt(null);
      setShowPwaBanner(false);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem("privydoc_pwa_previously_installed", "true");
    } else {
      localStorage.setItem("privydoc_pwa_dismissed", Date.now().toString());
    }
    setDeferredPrompt(null);
    setShowPwaBanner(false);
  };

  const handlePwaDismiss = () => {
    localStorage.setItem("privydoc_pwa_dismissed", Date.now().toString());
    setShowPwaBanner(false);
  };


  // Inactivity / Background TTL Lock (30 minutes)
  useEffect(() => {
    if (!patientSession) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const updateActivity = () => {
      if (!isPatientSessionLocked) {
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      }
    };

    const checkInactivity = () => {
      const lastActive = localStorage.getItem("privydoc_patient_last_active");
      if (lastActive) {
        const diff = Date.now() - parseInt(lastActive);
        if (diff > INACTIVITY_LIMIT) {
          setIsPatientSessionLocked(true);
        }
      } else {
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      }
    };

    // Listen to user interactions
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);
    // Listen to window focus (returning from background)
    window.addEventListener("focus", checkInactivity);

    // Initial check and periodic check
    checkInactivity();
    const interval = setInterval(checkInactivity, 30 * 1000); // Check every 30 seconds

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("focus", checkInactivity);
      clearInterval(interval);
    };
  }, [patientSession, isPatientSessionLocked]);

  // Success page redirect countdown
  useEffect(() => {
    if (patientSubView === "intake" && checkoutStep === "success") {
      setSuccessCountdown(5);
      const timer = setInterval(() => {
        setSuccessCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPatientSubView("portal");
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [patientSubView, checkoutStep]);

  // Synchronize state with browser history for back button navigation
  useEffect(() => {
    // Push initial state
    if (!window.history.state) {
      window.history.replaceState({ activeTab, patientSubView, selectedCaseId: selectedCase?.id, docView, adminView }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const state = event.state;
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.patientSubView) setPatientSubView(state.patientSubView);
        if (state.docView) setDocView(state.docView);
        if (state.adminView) setAdminView(state.adminView);
        if (state.selectedCaseId) {
          const c = consultationApi.getById(state.selectedCaseId);
          if (c) setSelectedCase(c);
        } else {
          setSelectedCase(null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Whenever key navigation state changes, push state to history
  useEffect(() => {
    const currentState = window.history.state;
    const stateMatches = currentState &&
      currentState.activeTab === activeTab &&
      currentState.patientSubView === patientSubView &&
      currentState.selectedCaseId === selectedCase?.id &&
      currentState.docView === docView &&
      currentState.adminView === adminView;

    if (!stateMatches) {
      window.history.pushState({
        activeTab,
        patientSubView,
        selectedCaseId: selectedCase?.id,
        docView,
        adminView
      }, "");
    }
  }, [activeTab, patientSubView, selectedCase?.id, docView, adminView]);

  // Prevent accidental browser exit when in the middle of an intake form or active consultation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isFillingIntake = activeTab === "patient" && patientSubView === "intake" && checkoutStep !== "success";
      const isClinicianActive = activeTab === "clinician" && currentDoctor && selectedDoctorCase && selectedDoctorCase.status !== "completed";
      
      if (isFillingIntake || isClinicianActive) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to exit?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeTab, patientSubView, checkoutStep, currentDoctor, selectedDoctorCase]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Fetch in-app notifications for the currently logged-in patient or doctor
  const fetchNotifications = async () => {
    try {
      if (patientSession) {
        const res = await fetch(`/api/data/notifications?recipient_type=eq.patient&recipient_id=eq.${encodeURIComponent(patientSession.phone)}&order=created_at.desc`, {
          headers: { "x-patient-phone": patientSession.phone }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setNotifications(data);
        }
      } else if (currentDoctor) {
        const res = await fetch(`/api/data/notifications?recipient_type=eq.doctor&recipient_id=eq.${encodeURIComponent(currentDoctor.id)}&order=created_at.desc`, {
          headers: { "x-doctor-id": currentDoctor.id }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setNotifications(data);
        }
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  // Poll notifications every 60 seconds while a patient or doctor session is active
  useEffect(() => {
    if (!patientSession && !currentDoctor) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60 * 1000);
    return () => clearInterval(interval);
  }, [patientSession, currentDoctor]);

  // Poll the currently open consultation's messages every 5 seconds so a chat stays in
  // sync between doctor and patient without either side needing to send a message or
  // manually refresh first (previously there was no polling at all for messages).
  useEffect(() => {
    if (!selectedCase) return;
    const caseId = selectedCase.id;
    const interval = setInterval(async () => {
      const fresh = await consultationApi.refreshConsultation(caseId);
      if (fresh) {
        console.log("[patient chat poll]", { consultation_id: caseId, message_count: fresh.messages.length });
        setSelectedCase(prev => (prev && prev.id === caseId ? fresh : prev));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedCase?.id]);

  useEffect(() => {
    if (!selectedDoctorCase) return;
    const caseId = selectedDoctorCase.id;
    const interval = setInterval(async () => {
      const fresh = await consultationApi.refreshConsultation(caseId);
      if (fresh) {
        console.log("[doctor chat poll]", { consultation_id: caseId, message_count: fresh.messages.length });
        setSelectedDoctorCase(prev => (prev && prev.id === caseId ? fresh : prev));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDoctorCase?.id]);

  const handleMarkNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (patientSession) headers["x-patient-phone"] = patientSession.phone;
      if (currentDoctor) headers["x-doctor-id"] = currentDoctor.id;
      await fetch(`/api/data/notifications?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ read: true })
      });
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (patientSession) headers["x-patient-phone"] = patientSession.phone;
      if (currentDoctor) headers["x-doctor-id"] = currentDoctor.id;
      await Promise.all(unreadIds.map(id =>
        fetch(`/api/data/notifications?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ read: true })
        })
      ));
    } catch (e) {
      console.error("Failed to mark all notifications read:", e);
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  // Discreet long-press on the logo (2s hold) routes to clinician login
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleLogoTouchStart = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setActiveTab("clinician");
    }, 2000);
  };
  const handleLogoTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const switchRoleSafely = (targetRole: "patient" | "clinician" | "admin", successAction: () => void) => {
    successAction();
  };

  // Enter the patient portal dashboard, claiming an active case if one exists
  const enterVault = () => {
    if (patientSession && !selectedCase) {
      const cases = consultationApi.getByPatientPhone(patientSession.phone);
      if (cases.length > 0) {
        setSelectedCase(cases[0]);
      }
    }
    setPatientSubView("portal");
  };

  // On initial load, a logged-in patient lands directly on their portal dashboard rather
  // than the visitor landing page. The "Welcome back" screen only appears afterwards if
  // they explicitly navigate back past the portal (e.g. via the browser back button).
  useEffect(() => {
    const patientSessionSaved = localStorage.getItem("privydoc_patient_session");
    const adminSessionSaved = !!localStorage.getItem("privydoc_admin_token");
    const doctorSessionSaved = localStorage.getItem("privydoc_doctor_session");
    const pendingPayment = localStorage.getItem("privydoc_pending_payment");

    if (patientSessionSaved && !adminSessionSaved && !doctorSessionSaved && !pendingPayment && window.location.hash !== "#admin") {
      setActiveTab("patient");
      enterVault();
    }
  }, []);

  // Symptom checker selector
  const handleSymptomSelect = (conditionId: string) => {
    const condition = MEN_HEALTH_CONDITIONS.find(c => c.id === conditionId);
    if (condition) {
      setSelectedCondition(condition);
      setSymptomAnswers({});
      setPatientSubView("symptom");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Check whether the patient has already self-declared Nigeria residence within the last 30 days
  const isGeoVerified = (): boolean => {
    try {
      const raw = localStorage.getItem("privydoc_geo_verified");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data.verified) return false;
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - (data.timestamp || 0) < THIRTY_DAYS_MS;
    } catch {
      return false;
    }
  };

  // Start Clinical Intake Form (triggers compliance pre-permission)
  const handleStartIntake = (condition: typeof MEN_HEALTH_CONDITIONS[0]) => {
    if (isGeoVerified()) {
      proceedWithIntake(condition);
      return;
    }
    setGeoCheckState("ask");
    setPendingCondition(condition);
    setPermissionModal("location");
  };

  const proceedWithIntake = (condition: typeof MEN_HEALTH_CONDITIONS[0]) => {
    setSelectedCondition(condition);
    setIntakeAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Check if patient is logged in
    if (patientSession) {
      setPatientName(patientSession.name);
      setPatientPhone(patientSession.phone);
      setPatientAge(patientSession.age.toString());
      setPatientEmail(patientSession.email || "");
      setCheckoutStep("form");
      setPatientSubView("intake");
    } else {
      // If not logged in, route to register or login first!
      setRegPhone(searchPhone);
      setPatientSubView("register");
      toast.warning("Please establish or unlock your secure patient vault first to initiate a confidential clinical intake.");
    }
  };

  // Complete Payment & Save Consultation using real Flutterwave gateway (or bypass in test mode)
  const handleCompletePayment = async (bypass: boolean = false, onPaymentCancelled?: () => void) => {
    if (!selectedCondition) return;
    setIsSubmittingIntake(true);

    // Build raw_answers from the real adaptive intake answers (intakeAnswers, keyed by
    // the q_-prefixed IDs from INTAKE_QUESTIONS_BANK/AdaptiveIntakeForm), not the older,
    // disconnected INTAKE_QUESTIONS/data.ts set. That legacy set uses different IDs
    // (e.g. "chest_pain" vs "q_ed_chest") that never matched intakeAnswers' keys, so
    // almost every question resolved to the "Not specified" fallback and the patient's
    // actual submitted answers (including cardiovascular safety answers, height/weight,
    // blood pressure) never reached raw_answers sent to the server. Now every entry
    // comes from the same field that now contains real answers.
    const answers = Object.entries(intakeAnswers)
      .map(([qId, value]) => {
        const bankQuestion = INTAKE_QUESTIONS_BANK.find(q => q.id === qId);
        if (!bankQuestion) return null;
        return {
          question: bankQuestion.text,
          answer: Array.isArray(value) ? value.join(", ") : String(value)
        };
      })
      .filter((a): a is { question: string; answer: string } => a !== null);

    // Read the checkout amount and Flutterwave public key dynamically from the
    // server-authoritative /api/config endpoint (backed by the same "pricing" table
    // the admin panel writes to), so the amount charged always matches what
    // /api/payment/verify validates against, and the public key stays in sync with env.
    let amount = pricingApi.getById("price_full")?.price ?? 7500;
    let flwPublicKey = "FLWPUBK_TEST-9bbfffa3e76a6cfb9fa490b7936a7985-X";
    try {
      const configRes = await fetch("/api/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        if (typeof configData.price_full === "number") {
          amount = configData.price_full;
        }
        if (configData.flwPublicKey) {
          flwPublicKey = configData.flwPublicKey;
        }
      }
    } catch (e) {
      console.error("Failed to fetch dynamic pricing config, using cached/fallback amount:", e);
    }

    const tx_ref = `pd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (bypass) {
      console.log("Executing test mode bypass transaction.");
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transaction_id: "pd_bypass_" + Math.random().toString(36).substr(2, 9),
            tx_ref,
            amount,
            payment_type: "new",
            patient_phone: patientPhone,
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 30,
            condition_title: selectedCondition.title,
            duration: intakeAnswers["duration"] || "3-6 months",
            raw_answers: answers
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Server verification of transaction failed.");
        }

        const data = await res.json();
        if (data.ok && data.consultation) {
          const cachedCons = JSON.parse(localStorage.getItem("privydoc_consultations") || "[]");
          cachedCons.push(data.consultation);
          localStorage.setItem("privydoc_consultations", JSON.stringify(cachedCons));

          localStorage.removeItem("privydoc_pending_payment");
          localStorage.removeItem("privydoc_pending_intake");

          setCheckoutStep("success");
          setSelectedCase(data.consultation);
          triggerRefresh();
        } else {
          toast.error(data.message || "Bypass verification failed.");
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Bypass error: " + (e.message || "Unknown error"));
      } finally {
        setIsSubmittingIntake(false);
      }
      return;
    }

    // Save active payment state to localStorage before opening Flutterwave
    localStorage.setItem("privydoc_pending_payment", JSON.stringify({
      selectedConditionId: selectedCondition.id,
      patientName,
      patientAge,
      patientPhone,
      patientEmail,
      intakeAnswers,
      paymentMethod,
      tx_ref,
      amount
    }));

    const customerEmail = patientEmail || "patient@privydoc.com.ng";

    // Open Flutterwave Checkout
    if (typeof (window as any).FlutterwaveCheckout === "function") {
      let paymentSuccessful = false;
      (window as any).FlutterwaveCheckout({
        public_key: flwPublicKey,
        tx_ref,
        amount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
          email: customerEmail,
          phone_number: patientPhone,
          name: patientName,
        },
        customizations: {
          title: "PrivyDoc Nigeria",
          description: `Telehealth Consultation - ${selectedCondition.title}`,
          logo: "https://app.privydoc.com.ng/pwa_logo.svg"
        },
        callback: async (response: any) => {
          console.log("FLW CALLBACK FIRED", {
            response,
            tx_ref,
            transaction_id: response.transaction_id || response.id,
            status: response.status
          });

          if (response.status !== "successful") {
            setIsSubmittingIntake(false);
            toast.error("Payment was not completed. Please try again.");
            return;
          }

          // Mark the transaction as Flutterwave-successful immediately (synchronously),
          // before any awaited work below. Flutterwave's inline SDK closes the modal
          // (firing onclose) right after invoking this callback - it does not wait for
          // this async function's internal promise to settle. Setting the flag only
          // after the /api/payment/verify round-trip resolved meant onclose could read
          // it while still false and wrongly treat a successful payment as a cancellation.
          paymentSuccessful = true;

          const transaction_id = response.transaction_id || response.id;

          try {
            // Verify payment server-side
            const verifyBody = {
              transaction_id,
              tx_ref,
              amount,
              payment_type: "new",
              patient_phone: patientPhone,
              patient_name: patientName,
              patient_age: parseInt(patientAge) || 30,
              condition_title: selectedCondition.title,
              duration: intakeAnswers["duration"] || "3-6 months",
              raw_answers: answers
            };
            console.log("[POST /api/payment/verify] request body", verifyBody);

            const res = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(verifyBody)
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.log("[POST /api/payment/verify] response NOT ok", { status: res.status, errData });
              throw new Error(errData.message || "Server verification of transaction failed.");
            }

            const data = await res.json();
            console.log("[POST /api/payment/verify] response ok", { status: res.status, data });

            if (data.ok && data.consultation) {
              // Save to LocalStorage list to sync client state
              const cachedCons = JSON.parse(localStorage.getItem("privydoc_consultations") || "[]");
              cachedCons.push(data.consultation);
              localStorage.setItem("privydoc_consultations", JSON.stringify(cachedCons));

              localStorage.removeItem("privydoc_pending_payment");
              localStorage.removeItem("privydoc_pending_intake");

              console.log("[payment verify succeeded] applying state changes", {
                setCheckoutStep: "success",
                consultation: data.consultation,
                consultation_stage: data.consultation?.stage
              });
              setCheckoutStep("success");
              setSelectedCase(data.consultation);
              triggerRefresh();
            } else {
              console.log("[payment verify] data.ok/data.consultation falsy, no state change applied", data);
              toast.error(data.message || "Payment verification failed.");
            }
          } catch (e: any) {
            console.error(e);
            toast.error(e.message || "We encountered an issue verifying your payment. Please contact help@privydoc.com.ng");
          } finally {
            setIsSubmittingIntake(false);
          }
        },
        onclose: () => {
          console.log("FLW ONCLOSE FIRED", { paymentSuccessful });
          if (!paymentSuccessful) {
            setIsSubmittingIntake(false);
            onPaymentCancelled?.();
          }
        }
      });
    } else {
      console.warn("Flutterwave script not loaded; executing offline auto-bypass/simulation.");
      // Auto-bypass for development environments when script fails to load
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transaction_id: "dev_tx_" + Math.random().toString(36).substr(2, 9),
            tx_ref,
            amount,
            payment_type: "new",
            patient_phone: patientPhone,
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 30,
            condition_title: selectedCondition.title,
            duration: intakeAnswers["duration"] || "3-6 months",
            raw_answers: answers
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Server verification of transaction failed.");
        }

        const data = await res.json();
        if (data.ok && data.consultation) {
          const cachedCons = JSON.parse(localStorage.getItem("privydoc_consultations") || "[]");
          cachedCons.push(data.consultation);
          localStorage.setItem("privydoc_consultations", JSON.stringify(cachedCons));

          localStorage.removeItem("privydoc_pending_payment");
          localStorage.removeItem("privydoc_pending_intake");

          setCheckoutStep("success");
          setSelectedCase(data.consultation);
          triggerRefresh();
        } else {
          toast.error(data.message || "Payment verification failed.");
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Verification server offline. Please try again.");
      } finally {
        setIsSubmittingIntake(false);
      }
    }
  };

  // Search Patient Portal Cases
  const handleSearchPatientPortal = async () => {
    if (!searchPhone) return;
    const key = searchPhone.toLowerCase().trim();
    if (key === "doctor" || key === "clinician") {
      switchRoleSafely("clinician", () => {
        setActiveTab("clinician");
        setSearchPhone("");
      });
      return;
    }
    if (key === "admin" || key === "root") {
      switchRoleSafely("admin", () => {
        setActiveTab("admin");
        setSearchPhone("");
      });
      return;
    }

    const normalized = normPhone(searchPhone);

    try {
      const res = await fetch(`/api/data/patients?phone=eq.${normalized}`);
      if (!res.ok) {
        throw new Error("Failed to query patients table via API");
      }
      const data = await res.json();
      const found = Array.isArray(data) && data.length > 0;

      if (found) {
        setLoginPhone(searchPhone);
        setPatientSubView("login");
      } else {
        setRegPhone(searchPhone);
        setPatientSubView("register");
      }
    } catch (error) {
      console.error("Error querying patients during portal search:", error);
      // Fail-soft fallback to local mock API database
      const existingPatient = patientApi.getByPhone(searchPhone);
      if (existingPatient) {
        setLoginPhone(searchPhone);
        setPatientSubView("login");
      } else {
        setRegPhone(searchPhone);
        setPatientSubView("register");
      }
    }
  };

  // Patient Registration Submit
  const handlePatientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regAge || !regState || !regEmail || !regConsent) {
      toast.warning("Please fill in all clinical registration details and accept the patient consent.");
      return;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    // Validate Name
    const nameTrimmed = regName.trim();
    if (!nameTrimmed.includes(" ") || nameTrimmed.split(/\s+/).length < 2) {
      toast.warning("Please enter both your first name and last name for clinical prescription eligibility.");
      return;
    }

    // Validate Phone Number
    const cleanedPhone = regPhone.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      toast.warning("Invalid phone format. Please enter a valid Nigerian WhatsApp number (e.g., +234 803 123 4567 or 08031234567).");
      return;
    }

    const ageNum = parseInt(regAge);
    if (isNaN(ageNum) || ageNum < 18) {
      toast.error("Under standard clinical guidelines, consultations are strictly restricted to individuals aged 18 and older.");
      return;
    }

    // Call real backend OTP send
    setRegOtp("");
    setOtpChannel("whatsapp");
    const res = await patientApi.sendOtp(regPhone, "whatsapp", regEmail);
    if (res.success) {
      setPatientSubView("otp");
      if (res.test_bypass) {
        toast.info(`Secure OTP Tunnel: A real OTP was generated for +${cleanedPhone}. For preview purposes, the code is '${res.test_bypass}'.`);
      } else {
        toast.success("A secure verification code has been sent to your WhatsApp number. Please check your messages.");
      }
    } else {
      toast.error(res.error || "Failed to dispatch verification code.");
    }
  };

  // Resend OTP via a chosen channel (WhatsApp or Email)
  const handleResendOtp = async (channel: "whatsapp" | "email") => {
    setOtpChannel(channel);
    const res = await patientApi.sendOtp(regPhone, channel, regEmail);
    if (res.success) {
      if (res.test_bypass) {
        toast.info(`Secure OTP Tunnel: code resent. For preview purposes, the code is '${res.test_bypass}'.`);
      } else {
        toast.success(`A new verification code has been sent via ${channel === "email" ? "Email" : "WhatsApp"}.`);
      }
    } else {
      toast.error(res.error || "Failed to resend verification code.");
    }
  };

  // Patient OTP Submit
  const handlePatientOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await patientApi.verifyOtp(regPhone, regOtp);
    if (res.success) {
      setPatientSubView("pinSetup");
    } else {
      toast.error(res.error || "Incorrect or expired verification code.");
    }
  };

  // Patient PIN Setup Submit
  const handlePatientPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regPin.length !== 6 || isNaN(parseInt(regPin))) {
      toast.warning("PIN must be exactly 6 numeric digits.");
      return;
    }
    if (regPin !== regPinConfirm) {
      toast.error("PIN confirmation does not match.");
      return;
    }

    // Complete patient registration
    const res = patientApi.register(regName, regPhone, parseInt(regAge), regState, regEmail, regPin);
    if (res.success && res.patient) {
      localStorage.setItem("privydoc_patient_session", JSON.stringify(res.patient));
      localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      setPatientSession(res.patient);
      
      // Clear registration state
      setRegName("");
      setRegPhone("");
      setRegAge("");
      setRegState("");
      setRegEmail("");
      setRegConsent(false);
      setRegOtp("");
      setRegPin("");
      setRegPinConfirm("");

      // Re-route
      const cases = consultationApi.getByPatientPhone(res.patient.phone);
      if (selectedCondition) {
        // Prepare Intake fields
        setPatientName(res.patient.name);
        setPatientPhone(res.patient.phone);
        setPatientAge(res.patient.age.toString());
        setPatientEmail(res.patient.email || "");
        setCheckoutStep("form");
        setPatientSubView("intake");
      } else {
        if (cases.length > 0) {
          setSelectedCase(cases[0]);
        } else {
          setSelectedCase(null);
        }
        setPatientSubView("portal");
      }
    } else {
      toast.error(res.error || "Failed to establish secure patient profile.");
    }
  };

  // Patient PIN Login Submit
  const handlePatientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await patientApi.login(loginPhone, loginPin);
    if (res.success && res.patient) {
      localStorage.setItem("privydoc_patient_session", JSON.stringify(res.patient));
      localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      setPatientSession(res.patient);
      setLoginPin("");

      const cases = consultationApi.getByPatientPhone(res.patient.phone);
      if (selectedCondition) {
        setPatientName(res.patient.name);
        setPatientPhone(res.patient.phone);
        setPatientAge(res.patient.age.toString());
        setPatientEmail(res.patient.email || "");
        setCheckoutStep("form");
        setPatientSubView("intake");
      } else {
        if (cases.length > 0) {
          setSelectedCase(cases[0]);
        } else {
          setSelectedCase(null);
        }
        setPatientSubView("portal");
      }
    } else {
      toast.error(res.error || "PIN authentication rejected.");
    }
  };

  // Patient PIN Recovery Handlers
  const handlePatientForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForgotPhone) {
      toast.warning("Registered phone number is required.");
      return;
    }
    setIsPatientForgotSending(true);
    try {
      // First, verify that this patient exists in DB
      const res = await fetch(`/api/auth/patient/verify-forgot?phone=${encodeURIComponent(patientForgotPhone.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.message || "No matching patient vault found for this number.");
        setIsPatientForgotSending(false);
        return;
      }

      // Send OTP
      const otpRes = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientForgotPhone })
      });
      const otpData = await otpRes.json();
      if (otpRes.ok && otpData.ok) {
        setPatientForgotMode("verify");
        toast.success("Verification code has been dispatched to your registered WhatsApp number.");
      } else {
        toast.error(otpData.message || "Failed to dispatch verification code.");
      }
    } catch (err) {
      toast.error("Security service communication failed.");
    } finally {
      setIsPatientForgotSending(false);
    }
  };

  const handlePatientForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientForgotNewPin.length !== 6 || isNaN(Number(patientForgotNewPin))) {
      toast.warning("PIN must be exactly 6 numeric digits.");
      return;
    }
    if (patientForgotNewPin !== patientForgotNewPinConfirm) {
      toast.error("PIN confirmation does not match.");
      return;
    }
    setIsPatientForgotSending(true);
    try {
      const resetRes = await fetch("/api/auth/patient/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: patientForgotPhone,
          otp: patientForgotOtp,
          pin: patientForgotNewPin
        })
      });
      const resetData = await resetRes.json();
      if (resetRes.ok && resetData.ok) {
        toast.success("Your Secure Vault PIN has been reset successfully! You can now log in with your new passcode.");
        setPatientForgotMode("none");
        setPatientForgotPhone("");
        setPatientForgotOtp("");
        setPatientForgotNewPin("");
        setPatientForgotNewPinConfirm("");
        setLoginPhone(patientForgotPhone);
        setPatientSubView("login");
      } else {
        toast.error(resetData.message || "Failed to reset vault PIN. Verify your OTP is correct.");
      }
    } catch (err) {
      toast.error("Security service verification failed.");
    } finally {
      setIsPatientForgotSending(false);
    }
  };

  // Secure Vault Unlock PIN verification
  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    if (unlockPin.length !== 6) {
      setUnlockError("PIN must be exactly 6 numeric digits.");
      return;
    }

    try {
      // Direct call to patient login endpoint or local fallback
      const response = await fetch("/api/auth/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normPhone(patientSession?.phone || ""), pin: unlockPin })
      });
      const data = await response.json();
      if (response.ok && (data.success || data.ok)) {
        setIsPatientSessionLocked(false);
        setUnlockPin("");
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
        if (patientSession) {
          const cases = consultationApi.getByPatientPhone(patientSession.phone);
          if (cases.length > 0) {
            setSelectedCase(cases[0]);
          }
        }
        setPatientSubView("portal");
      } else {
        setUnlockError(data.message || "Incorrect 6-digit PIN.");
      }
    } catch (err) {
      if (patientSession && patientSession.pin_hash === unlockPin) {
        setIsPatientSessionLocked(false);
        setUnlockPin("");
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
        const cases = consultationApi.getByPatientPhone(patientSession.phone);
        if (cases.length > 0) {
          setSelectedCase(cases[0]);
        }
        setPatientSubView("portal");
      } else {
        setUnlockError("Invalid PIN. Vault access denied.");
      }
    }
  };

  // True while the patient is actively filling out the clinical intake form.
  // Mirrored into a ref so that handlers/closures created before a state update
  // (e.g. nav buttons re-rendered on a slower mobile JS thread) always read the latest value.
  const isMidIntake = activeTab === "patient" && patientSubView === "intake" && checkoutStep !== "success";
  const isIntakeActiveRef = useRef(false);
  useEffect(() => {
    isIntakeActiveRef.current = isMidIntake;
  }, [isMidIntake]);

  // Shows the intake-abandonment warning if mid-intake. Returns true if the
  // caller should proceed with the navigation/action, false if the patient chose to stay.
  const confirmLeaveIntakeIfNeeded = async (): Promise<boolean> => {
    if (!isIntakeActiveRef.current) return true;
    const stay = await confirm(
      "Your progress will be lost if you leave now. Are you sure you want to cancel this assessment?",
      { confirmLabel: "Stay", cancelLabel: "Leave Assessment" }
    );
    return !stay;
  };

  // Patient Logout
  const handlePatientLogout = async () => {
    if (isIntakeActiveRef.current) {
      const canLeave = await confirmLeaveIntakeIfNeeded();
      if (!canLeave) return;
    } else {
      const stayLoggedIn = await confirm(
        "Are you sure you want to log out? Your active session will end.",
        { confirmLabel: "Stay Logged In", cancelLabel: "Log Out" }
      );
      if (stayLoggedIn) return;
    }
    localStorage.removeItem("privydoc_patient_session");
    setPatientSession(null);
    setSelectedCase(null);
    setSearchPhone("");
    setSkipWelcomeBack(false);
    setPatientSubView("landing");
  };

  // Update editable patient profile fields (first name, email, state). Phone is the identity key and is never changed.
  const handleUpdateProfile = async (updates: { first_name: string; email: string; state: string }) => {
    if (!patientSession) return;
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientSession.phone, ...updates })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Failed to update profile. Please try again.");
        return;
      }
      const updatedSession = { ...patientSession, ...data.patient };
      localStorage.setItem("privydoc_patient_session", JSON.stringify(updatedSession));
      setPatientSession(updatedSession);
      toast.success("Profile updated successfully.");
    } catch (e) {
      console.error("Profile update failed:", e);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  // Permanently delete the patient's account and all consultation records
  const handleDeleteAccount = async () => {
    if (!patientSession) return;
    const confirmed = await confirm(
      "This will permanently delete your account and all consultation records. This cannot be undone.",
      { confirmLabel: "Delete My Account", cancelLabel: "Cancel", cancelIsGold: true, danger: true }
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/auth/patient/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientSession.phone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Failed to delete account. Please try again.");
        return;
      }
      toast.success("Your account and all consultation records have been permanently deleted.");
    } catch (e) {
      console.error("Account deletion failed:", e);
      toast.error("Failed to delete account. Please try again.");
    } finally {
      localStorage.removeItem("privydoc_patient_session");
      localStorage.removeItem("privydoc_patient_last_active");
      localStorage.removeItem("privydoc_pending_payment");
      localStorage.removeItem("privydoc_pending_intake");
      setPatientSession(null);
      setSelectedCase(null);
      setSearchPhone("");
      setSkipWelcomeBack(false);
      setPatientSubView("landing");
    }
  };

  // Patient chat send — routes through the server (not the client-side addMessage path)
  // so the 3-slot clarification limit and Claude holding-response can be enforced.
  const handleSendPatientMsg = async () => {
    if (!selectedCase || !patientMessage.trim() || !patientSession) return;
    const messageToSend = patientMessage;
    try {
      const res = await fetch(`/api/consultations/${selectedCase.id}/patient-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-patient-phone": patientSession.phone
        },
        body: JSON.stringify({ content: messageToSend, thread_id: selectedCase.thread_id })
      });
      const data = await res.json().catch(() => ({}));
      console.log("[handleSendPatientMsg] result", data);

      if (res.status === 403 && data.code === "SLOTS_FULL") {
        toast.error(data.message || "Clarification slots full. Your doctor will respond at Day 5.");
        return;
      }
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Could not send message. Please try again.");
        return;
      }

      setPatientMessage("");
      if (data.consultation) setSelectedCase(data.consultation);
      triggerRefresh();
    } catch (e) {
      console.error("[handleSendPatientMsg] failed:", e);
      toast.error("Could not send message. Please try again.");
    }
  };

  // Clinician Registration
  const handleDoctorRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    if (!docRegName || !docRegPhone || !docRegFolio || !docRegPin) {
      setDocError("Please fill out all clinician registration fields.");
      return;
    }
    const res = doctorApi.register(docRegName, docRegPhone, docRegFolio, parseInt(docRegAplYear) || 2026, docRegPin);
    if (res.success) {
      setDocSuccess("Clinician account submitted! Pending MDCN Folio credential verification by administrative officers.");
      setIsRegistering(false);
      // Pre-fill login
      setDocFolio(docRegFolio);
    } else {
      setDocError(res.error || "Registration failed.");
    }
  };

  // Clinician Login
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    const res = await doctorApi.login(docFolio, docPin);
    if (res.success) {
      if (!res.doctor?.verified) {
        setDocError("Your account is registered but pending Admin credential verification.");
        return;
      }
      setCurrentDoctor(res.doctor);
      setDocView("cases");
    } else {
      setDocError(res.error || "Login credentials rejected.");
    }
  };

  // Doctor claim case
  const handleDoctorClaimCase = (caseId: string) => {
    if (!currentDoctor) return;
    if (currentDoctor.status === "suspended" || currentDoctor.flagged) {
      setDocError("Compliance Restriction: Your clinical portfolio is currently suspended under MDCN Supervision. You cannot claim new clinical folders.");
      return;
    }
    const res = consultationApi.claim(caseId, currentDoctor.id, currentDoctor.name);
    if (res.success) {
      // Reload active case
      const updated = consultationApi.getById(caseId);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
    }
  };

  // Doctor chat send
  const handleSendDoctorMsg = async () => {
    if (!selectedDoctorCase || !currentDoctor || !doctorMessage.trim()) return;

    const validation = validateTemplatePlaceholders(doctorMessage);
    if (!validation.ok) {
      toast.error(`Submission Blocked: Clinical templates contain 5 or more unedited placeholder tokens. Please customize these prior to sending:\n\n${validation.tokens.join(", ")}`);
      return;
    }

    const res = await consultationApi.addMessage(selectedDoctorCase.id, "doctor", currentDoctor.name, doctorMessage);
    console.log("[handleSendDoctorMsg] result", res);
    if (res.success) {
      setDoctorMessage("");
      if (res.consultation) setSelectedDoctorCase(res.consultation);
      triggerRefresh();
    }
  };

  // AI assistant response generator
  const handleGenerateAIDraft = async () => {
    if (!selectedDoctorCase || !aiPrompt.trim()) return;
    setIsGeneratingDraft(true);
    setAiDraft("");
    try {
      const draft = await consultationApi.generateDraftResponse(selectedDoctorCase, aiPrompt);
      setAiDraft(draft);
    } catch (e) {
      setAiDraft("Failed to generate draft. Please ensure server has active GEMINI_API_KEY.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Complete consultation by doctor
  const handleCompleteConsultation = () => {
    if (!selectedDoctorCase) return;

    const notesValidation = validateTemplatePlaceholders(closingNotes);
    const prescriptionValidation = validateTemplatePlaceholders(closingPrescription);
    if (!notesValidation.ok || !prescriptionValidation.ok) {
      const allPlaceholders = Array.from(new Set([...notesValidation.tokens, ...prescriptionValidation.tokens]));
      toast.error(`Submission Blocked: Clinical notes or prescription contain 5 or more unedited placeholder tokens. Please customize these prior to certifying:\n\n${allPlaceholders.join(", ")}`);
      return;
    }

    const res = consultationApi.complete(selectedDoctorCase.id, closingNotes, closingPrescription);
    if (res.success) {
      setShowCloseModal(false);
      setClosingNotes("");
      setClosingPrescription("");
      // Reload case
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
      toast.success("Consultation complete! Digital evaluation and cryptographic prescription issued.");
    }
  };

  // Doctor payout request
  const handlePayoutRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutMsg({ type: "", text: "" });
    if (!currentDoctor) return;
    
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayoutMsg({ type: "error", text: "Please enter a valid payout amount." });
      return;
    }
    if (!payoutBank || !payoutAccount) {
      setPayoutMsg({ type: "error", text: "Please enter your verified banking details." });
      return;
    }

    const res = adminApi.requestPayout(currentDoctor.id, currentDoctor.name, amount, payoutBank, payoutAccount);
    if (res.success) {
      setPayoutMsg({ type: "success", text: "Payout request submitted! Processing takes 12-24 hours." });
      doctorApi.updatePayoutDetails(currentDoctor.id, payoutBank, payoutAccount);
      setPayoutAmount("");
      triggerRefresh();
    } else {
      setPayoutMsg({ type: "error", text: res.error || "Failed to initiate payout." });
    }
  };

  // Admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (!data.token) {
          toast.error("Admin login failed: no session token returned. Please contact support.");
          return;
        }
        localStorage.setItem("privydoc_admin_token", data.token);
        setIsAdminAuthenticated(true);
        setAdminView("verifications");
      } else {
        toast.error(data.message || "Invalid Admin clearance PIN.");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      toast.error("Admin authentication service is currently offline. Please try again later.");
    }
  };

  // Admin logout
  const handleAdminLogout = () => {
    const token = localStorage.getItem("privydoc_admin_token");
    if (token) {
      fetch("/api/auth/admin/logout", {
        method: "POST",
        headers: { "x-admin-auth": token }
      }).catch(() => {});
    }
    setIsAdminAuthenticated(false);
  };

  // Admin verification action
  const handleAdminVerifyDoctor = (docId: string, approve: boolean) => {
    adminApi.verifyClinician(docId, approve);
    triggerRefresh();
  };

  // Admin payout action
  const handleAdminApprovePayout = (payId: string, approve: boolean) => {
    if (approve) {
      adminApi.approvePayout(payId);
    } else {
      adminApi.rejectPayout(payId);
    }
    triggerRefresh();
  };

  // Role-aware sidebar/bottom-nav items. Each routes into the existing per-role view state.
  type NavItem = { label: string; icon: React.ReactNode; active: boolean; onClick: () => void };
  const sidebarNavItems: NavItem[] = (() => {
    if (activeTab === "patient" && patientSession) {
      const goPortal = (tab: typeof patientPortalTab) => {
        setPatientPortalTab(tab);
        if (patientSubView !== "portal") enterVault();
      };
      return [
        { label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, active: patientPortalTab === "dashboard" && patientSubView === "portal", onClick: () => goPortal("dashboard") },
        { label: "My Cases", icon: <ListChecks className="w-4 h-4" />, active: patientPortalTab === "cases" && patientSubView === "portal", onClick: () => goPortal("cases") },
        { label: "Messages", icon: <MessageSquare className="w-4 h-4" />, active: patientPortalTab === "messages" && patientSubView === "portal", onClick: () => goPortal("messages") },
        { label: "Reports/Rx", icon: <FileText className="w-4 h-4" />, active: patientPortalTab === "reports" && patientSubView === "portal", onClick: () => goPortal("reports") },
        { label: "Profile", icon: <Settings2 className="w-4 h-4" />, active: patientPortalTab === "profile" && patientSubView === "portal", onClick: () => goPortal("profile") }
      ];
    }
    if (activeTab === "clinician" && currentDoctor) {
      return [
        { label: "Queue", icon: <Inbox className="w-4 h-4" />, active: docView === "cases", onClick: () => { setSelectedDoctorCase(null); setDocView("cases"); } },
        { label: "Active Cases", icon: <ListChecks className="w-4 h-4" />, active: docView === "cases", onClick: () => setDocView("cases") },
        { label: "Messages", icon: <MessageSquare className="w-4 h-4" />, active: docView === "cases", onClick: () => setDocView("cases") },
        { label: "Earnings", icon: <Wallet className="w-4 h-4" />, active: docView === "wallet", onClick: () => setDocView("wallet") },
        { label: "Support", icon: <LifeBuoy className="w-4 h-4" />, active: false, onClick: () => { window.location.href = "mailto:help@privydoc.com.ng"; } }
      ];
    }
    if (activeTab === "admin" && isAdminAuthenticated) {
      return [
        { label: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, active: adminView === "verifications", onClick: () => setAdminView("verifications") },
        { label: "Patients", icon: <Users className="w-4 h-4" />, active: adminView === "cases", onClick: () => setAdminView("cases") },
        { label: "Doctors", icon: <Stethoscope className="w-4 h-4" />, active: adminView === "verifications", onClick: () => setAdminView("verifications") },
        { label: "Consultations", icon: <Inbox className="w-4 h-4" />, active: adminView === "cases", onClick: () => setAdminView("cases") },
        { label: "Payouts", icon: <Wallet className="w-4 h-4" />, active: adminView === "payouts", onClick: () => setAdminView("payouts") },
        { label: "Config", icon: <Settings2 className="w-4 h-4" />, active: adminView === "pricing", onClick: () => setAdminView("pricing") }
      ];
    }
    return [];
  })();

  return (
    <div className="app-shell text-[#e4e4e7] selection:bg-[#d4af37]/40 selection:text-white font-sans antialiased">
      {isPatientSessionLocked && patientSession && (
        <div className="fixed inset-0 bg-[#06080c]/98 z-[9999] flex items-center justify-center p-6 animate-fade-in" id="scrPinResume">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-8 space-y-6 text-center shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-[#E5C158] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Secure Session Locked
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                For your clinical data confidentiality, your secure PrivyDoc Vault has been locked after 30 minutes of background or idle inactivity.
              </p>
            </div>

            <form onSubmit={handleUnlockSession} className="space-y-4">
              <div className="space-y-2 text-left">
                <label htmlFor="unlock-pin" className="text-[10px] uppercase font-mono text-zinc-400 font-bold block">
                  Enter Your Secure 6-Digit PIN
                </label>
                <input
                  id="unlock-pin"
                  required
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-[#E5C158] font-mono focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>

              {unlockError && (
                <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-xl text-center font-mono">
                  {unlockError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Unlock Session
              </button>
            </form>

            <button
              onClick={() => {
                localStorage.removeItem("privydoc_patient_session");
                setPatientSession(null);
                setIsPatientSessionLocked(false);
                setPatientSubView("landing");
                setUnlockPin("");
                setUnlockError("");
              }}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors underline block mx-auto mt-2"
            >
              Sign Out / Switch Vault Account
            </button>
          </div>
        </div>
      )}
      {/* Tablet sidebar scrim */}
      {sidebarNavItems.length > 0 && isTablet && tabletSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[90]"
          onClick={() => setTabletSidebarOpen(false)}
        />
      )}

      {/* APP SIDEBAR (tablet: collapsible drawer, desktop: persistent) — only shown when logged in */}
      {sidebarNavItems.length > 0 && (
      <div className={`app-sidebar ${tabletSidebarOpen ? "open" : ""}`}>
        <div className="px-5 py-5 border-b border-zinc-900/80 flex items-center justify-between">
          <button
            onClick={() => {
              switchRoleSafely("patient", () => {
                setActiveTab("patient");
                setPatientSubView("landing");
                setSelectedCase(null);
              });
              setTabletSidebarOpen(false);
            }}
            className="focus:outline-none text-left select-none cursor-pointer"
          >
            <Logo className="h-8" />
          </button>
          {isTablet && (
            <button
              onClick={() => setTabletSidebarOpen(false)}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarNavItems.length === 0 ? (
            <p className="px-2 text-[10px] text-zinc-600 font-mono">No navigation available.</p>
          ) : (
            sidebarNavItems.map((item) => (
              <button
                key={item.label}
                onClick={async () => {
                  if (!(await confirmLeaveIntakeIfNeeded())) return;
                  item.onClick();
                  setTabletSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  item.active ? "bg-[#d4af37]/10 text-[#E5C158]" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))
          )}
        </nav>

        {/* Sidebar bottom user info */}
        <div className="px-4 py-4 border-t border-zinc-900/80 space-y-2.5">
          {activeTab === "patient" && patientSession ? (
            <>
              <p className="text-xs font-bold text-white truncate">{patientSession.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{patientSession.phone}</p>
              <button
                onClick={handlePatientLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </>
          ) : activeTab === "clinician" && currentDoctor ? (
            <>
              <p className="text-xs font-bold text-white truncate">Dr. {currentDoctor.name}</p>
              <button
                onClick={() => setDoctorOnlineStatus(s => s === "online" ? "away" : "online")}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                  doctorOnlineStatus === "online"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${doctorOnlineStatus === "online" ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                {doctorOnlineStatus === "online" ? "Online" : "Away"}
              </button>
              <button
                onClick={() => { setCurrentDoctor(null); setSelectedDoctorCase(null); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </>
          ) : activeTab === "admin" && isAdminAuthenticated ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </span>
              <button
                onClick={handleAdminLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </>
          ) : null}
        </div>
      </div>
      )}

      <div className="app-main">
        {/* GLOBAL LUXURY HEADER */}
        <header className="border-b border-zinc-900/80 bg-black/85 backdrop-blur sticky top-0 z-40 px-6 py-4 flex justify-between items-center gap-4">

          <div className="flex items-center gap-3">
            {/* Hamburger (tablet only — sidebar is collapsible there) */}
            {isTablet && sidebarNavItems.length > 0 && (
              <button
                onClick={() => setTabletSidebarOpen(p => !p)}
                className="text-zinc-400 hover:text-white p-1.5 -ml-1.5"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Custom Gold Brand Logo */}
            <button
              onClick={() => {
                if (longPressTriggered.current) {
                  longPressTriggered.current = false;
                  return;
                }
                switchRoleSafely("patient", () => {
                  setActiveTab("patient");
                  setPatientSubView("landing");
                  setSelectedCase(null);
                });
              }}
              onTouchStart={handleLogoTouchStart}
              onTouchEnd={handleLogoTouchEnd}
              onMouseDown={handleLogoTouchStart}
              onMouseUp={handleLogoTouchEnd}
              className="focus:outline-none text-left select-none cursor-pointer"
            >
              <Logo className="h-9" />
            </button>
          </div>

          {/* In-App Notification Bell (logged-in patients & doctors only) */}
          {((activeTab === "patient" && patientSession) || (activeTab === "clinician" && currentDoctor)) && (
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(p => !p)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-[#E5C158] transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#d4af37] text-black text-[9px] font-extrabold flex items-center justify-center">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <NotificationPanel
                  notifications={notifications}
                  onMarkRead={handleMarkNotificationRead}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onClose={() => setShowNotifPanel(false)}
                  formatDate={formatDate}
                />
              )}
            </div>
          )}
        </header>

        {/* RENDER STAGE FRAMEWORK */}
        <main className="flex-1 px-6 py-10 overflow-y-auto space-y-8">
        
        {/* I. PATIENT STAGE FLOW */}
        {activeTab === "patient" && (
          <div className="space-y-12">
            
            {/* Landing */}
            {patientSubView === "landing" && patientSession && !skipWelcomeBack && (
              <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
                <div className="max-w-sm w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                  <h2 className="text-xl font-bold text-[#d4af37]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Welcome back, {patientSession.name?.split(" ")[0] || patientSession.name}
                  </h2>
                  {(() => {
                    const activeCount = consultationApi.getByPatientPhone(patientSession.phone).filter(c => c.status !== "completed").length;
                    return activeCount > 0 ? (
                      <p className="text-xs text-zinc-400">
                        You have <span className="text-white font-bold">{activeCount}</span> active case{activeCount === 1 ? "" : "s"}.
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">No active cases right now.</p>
                    );
                  })()}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={enterVault}
                      className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all"
                    >
                      Enter Your Vault
                    </button>
                    <button
                      onClick={() => setSkipWelcomeBack(true)}
                      className="w-full py-3 bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all"
                    >
                      Start New Consultation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {patientSubView === "landing" && (!patientSession || skipWelcomeBack) && (
              <PatientLanding
                onSelectSymptom={handleSymptomSelect}
                onStartIntake={handleStartIntake}
                onEnterPortal={enterVault}
                searchPhone={searchPhone}
                setSearchPhone={setSearchPhone}
                onSearchPortal={handleSearchPatientPortal}
                patientSession={patientSession}
                onLogout={handlePatientLogout}
                onSelectClinician={() => {
                  switchRoleSafely("clinician", () => {
                    setActiveTab("clinician");
                    setDocView("login");
                  });
                }}
              />
            )}

            {/* Patient Registration Screen */}
            {patientSubView === "register" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                
                {/* Back Button to prevent strandings */}
                <div className="flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => setPatientSubView("landing")}
                    className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-bold font-mono"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Programs
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Secure Patient Profile</h4>
                  <p className="text-xs text-zinc-500 font-sans">Establish your private, confidential clinical folder.</p>
                </div>
                
                <form onSubmit={handlePatientRegisterSubmit} className="space-y-4">
                  
                  {/* Full Name Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-name" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Full Name
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Enter your legal name as on bank/ID records to ensure clinical prescription validity.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: Adebayo Okafor</span>
                    </div>
                    <input 
                      id="reg-name"
                      type="text"
                      required
                      placeholder="e.g. Adebayo Okafor"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                    <p className="text-[9.5px] text-zinc-600 font-sans">Must match identification records if clinical prescriptions are issued.</p>
                  </div>

                  {/* Confidential WhatsApp Number Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Confidential WhatsApp Number
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Serves as your unique identifier to safely retrieve consult files and digital prescriptions.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: +234 803 123 4567</span>
                    </div>
                    <input 
                      id="reg-phone"
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono transition-colors"
                    />
                    <p className="text-[9.5px] text-zinc-600 font-sans">Used exclusively for secure vault verification and notifications.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Age Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label htmlFor="reg-age" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                          Age (Min 18)
                          <span className="relative group inline-block">
                            <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-40 text-center leading-normal z-50 shadow-2xl">
                              Consultations are strictly restricted to adults aged 18+ under MDCN regulations.
                            </span>
                          </span>
                        </label>
                      </div>
                      <input 
                        id="reg-age"
                        type="number"
                        required
                        min="18"
                        max="120"
                        placeholder="Age"
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono transition-colors"
                      />
                      <p className="text-[9px] text-zinc-600 font-sans">Min: 18, Max: 120.</p>
                    </div>

                    {/* State Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label htmlFor="reg-state" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                          State
                          <span className="relative group inline-block">
                            <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-40 text-center leading-normal z-50 shadow-2xl">
                              Required for demographic logging and local pharmacy dispatch coordination.
                            </span>
                          </span>
                        </label>
                      </div>
                      <select
                        id="reg-state"
                        required
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
                      >
                        <option value="">Select State</option>
                        {[
                          "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
                          "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
                          "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
                          "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
                          "Sokoto", "Taraba", "Yobe", "Zamfara"
                        ].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-zinc-600 font-sans">Current residence state.</p>
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-email" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Email Address
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Used optionally to receive duplicate backup notifications of your diagnostic outcomes.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: patient@domain.com</span>
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="e.g. name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                    <p className="text-[9px] text-zinc-600 font-sans">Required for OTP verification and secure backup copies of your medical outcomes.</p>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-3 pt-2">
                    <input 
                      id="consent"
                      type="checkbox"
                      required
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-900 bg-black text-[#d4af37] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="consent" className="text-[10px] text-zinc-500 leading-relaxed select-none font-sans">
                      I affirm that I am a male individual aged 18 or older residing in Nigeria, and consent to asynchronous digital clinical reviews.
                    </label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow mt-4"
                  >
                    Send Verification Code
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button 
                    onClick={() => setPatientSubView("login")}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                  >
                    Already registered? Unlock Secure Vault
                  </button>
                </div>
              </div>
            )}

            {/* Patient OTP Verification Screen */}
            {patientSubView === "otp" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify Your Code</h4>
                  <p className="text-xs text-zinc-500 font-sans">
                    Confidential authentication code dispatched via {otpChannel === "email" ? "Email" : "WhatsApp"}.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleResendOtp("whatsapp")}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      otpChannel === "whatsapp"
                        ? "border-[#d4af37] bg-[#d4af37]/10 text-[#E5C158]"
                        : "border-zinc-900 bg-black text-zinc-500 hover:border-zinc-800"
                    }`}
                  >
                    Send to WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendOtp("email")}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      otpChannel === "email"
                        ? "border-[#d4af37] bg-[#d4af37]/10 text-[#E5C158]"
                        : "border-zinc-900 bg-black text-zinc-500 hover:border-zinc-800"
                    }`}
                  >
                    Send to Email
                  </button>
                </div>

                <form onSubmit={handlePatientOtpSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Verification Code</label>
                    <input 
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 123456"
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                  >
                    Verify Code & Continue
                  </button>
                </form>

                <p className="text-center text-[10px] text-zinc-500 font-mono">
                  Didn't receive it? Resend via{" "}
                  <button
                    type="button"
                    onClick={() => handleResendOtp("whatsapp")}
                    className="text-[#E5C158] hover:underline"
                  >
                    WhatsApp
                  </button>
                  {" "}or{" "}
                  <button
                    type="button"
                    onClick={() => handleResendOtp("email")}
                    className="text-[#E5C158] hover:underline"
                  >
                    Email
                  </button>
                </p>

                <div className="text-center">
                  <button
                    onClick={() => setPatientSubView("register")}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                  >
                    Back to registration details
                  </button>
                </div>
              </div>
            )}

            {/* Patient PIN Setup Screen */}
            {patientSubView === "pinSetup" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Vault PIN</h4>
                  <p className="text-xs text-zinc-500 font-sans">Establish a secure 6-digit passcode to lock your clinical file.</p>
                </div>

                <form onSubmit={handlePatientPinSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Create 6-Digit PIN</label>
                    <input 
                      type="password"
                      required
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••••"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Confirm 6-Digit PIN</label>
                    <input 
                      type="password"
                      required
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••••"
                      value={regPinConfirm}
                      onChange={(e) => setRegPinConfirm(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                  >
                    Activate Confidential Vault
                  </button>
                </form>
              </div>
            )}

            {/* Patient PIN Login Screen */}
            {patientSubView === "login" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                
                {patientForgotMode === "phone" ? (
                  /* PATIENT PIN RECOVERY - REQUEST OTP */
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Vault PIN Recovery</h4>
                      <p className="text-xs text-zinc-500 font-sans">Verify your registered number to receive a secure recovery code via WhatsApp.</p>
                    </div>

                    <form onSubmit={handlePatientForgotSendOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Registered WhatsApp Number</label>
                        <input 
                          id="forgot-patient-phone"
                          type="tel"
                          required
                          placeholder="e.g. +234 803 123 4567"
                          value={patientForgotPhone}
                          onChange={(e) => setPatientForgotPhone(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isPatientForgotSending}
                        className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow disabled:opacity-50"
                      >
                        {isPatientForgotSending ? "Verifying..." : "Dispatch Secure Code"}
                      </button>
                    </form>

                    <div className="text-center pt-2">
                      <button 
                        type="button"
                        onClick={() => { setPatientForgotMode("none"); }}
                        className="text-[10px] font-mono text-[#E5C158] hover:underline"
                      >
                        Back to Vault Unlock
                      </button>
                    </div>
                  </div>
                ) : patientForgotMode === "verify" ? (
                  /* PATIENT PIN RECOVERY - VERIFY & RESET */
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Authorize Reset</h4>
                      <p className="text-xs text-zinc-500 font-sans">Verification code has been dispatched. Set your new clinical vault security PIN.</p>
                    </div>

                    <form onSubmit={handlePatientForgotResetSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-otp" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">WhatsApp Code (6-Digit)</label>
                        <input 
                          id="forgot-patient-otp"
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={patientForgotOtp}
                          onChange={(e) => setPatientForgotOtp(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-new-pin" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">New 6-Digit PIN</label>
                        <input 
                          id="forgot-patient-new-pin"
                          type="password"
                          required
                          maxLength={6}
                          placeholder="e.g. ••••••"
                          value={patientForgotNewPin}
                          onChange={(e) => setPatientForgotNewPin(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-new-pin-confirm" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Confirm New PIN</label>
                        <input 
                          id="forgot-patient-new-pin-confirm"
                          type="password"
                          required
                          maxLength={6}
                          placeholder="e.g. ••••••"
                          value={patientForgotNewPinConfirm}
                          onChange={(e) => setPatientForgotNewPinConfirm(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isPatientForgotSending}
                        className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow disabled:opacity-50"
                      >
                        {isPatientForgotSending ? "Applying Reset..." : "Establish New Vault PIN"}
                      </button>
                    </form>

                    <div className="text-center pt-2">
                      <button 
                        type="button"
                        onClick={() => { setPatientForgotMode("none"); }}
                        className="text-[10px] font-mono text-[#E5C158] hover:underline"
                      >
                        Cancel Recovery
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STANDARD LOGIN SCREEN */
                  <>
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Unlock Secure Vault</h4>
                      <p className="text-xs text-zinc-500 font-sans">Confidential clinical portal access.</p>
                    </div>

                    <form onSubmit={handlePatientLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="login-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Registered WhatsApp Number</label>
                        <input 
                          id="login-phone"
                          type="tel"
                          required
                          placeholder="e.g. +234 803 123 4567"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label htmlFor="login-pin" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Enter 6-Digit PIN</label>
                          <button 
                            type="button"
                            onClick={() => { setPatientForgotMode("phone"); setPatientForgotPhone(loginPhone); }}
                            className="text-[9.5px] font-mono text-[#E5C158] hover:underline font-bold"
                          >
                            Forgot PIN?
                          </button>
                        </div>
                        <input 
                          id="login-pin"
                          type="password"
                          required
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          placeholder="••••••"
                          value={loginPin}
                          onChange={(e) => setLoginPin(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                      >
                        Unlock Secure Vault
                      </button>
                    </form>

                    <div className="text-center pt-2 flex justify-between text-[10px] font-mono text-zinc-500">
                      <button 
                        type="button"
                        onClick={() => setPatientSubView("register")}
                        className="hover:text-zinc-300 transition-colors"
                      >
                        Establish New Vault
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPatientSubView("landing")}
                        className="hover:text-zinc-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Symptom Logic Screen */}
            {patientSubView === "symptom" && selectedCondition && (
              <SymptomChecker 
                selectedCondition={selectedCondition}
                symptomAnswers={symptomAnswers}
                setSymptomAnswers={setSymptomAnswers}
                onCancel={() => setPatientSubView("landing")}
                onStartIntake={handleStartIntake}
              />
            )}

            {/* Case Demographics & Questionnaires Form */}
            {patientSubView === "intake" && selectedCondition && checkoutStep !== "success" && (
              <IntakeForm
                selectedCondition={selectedCondition}
                patientSession={patientSession}
                patientName={patientName}
                setPatientName={setPatientName}
                patientAge={patientAge}
                setPatientAge={setPatientAge}
                patientPhone={patientPhone}
                setPatientPhone={setPatientPhone}
                patientEmail={patientEmail}
                intakeAnswers={intakeAnswers}
                setIntakeAnswers={setIntakeAnswers}
                checkoutStep={checkoutStep}
                setCheckoutStep={setCheckoutStep}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                isSubmittingIntake={isSubmittingIntake}
                onCompletePayment={handleCompletePayment}
                onCancel={() => {
                  localStorage.removeItem("privydoc_pending_payment");
                  localStorage.removeItem("privydoc_pending_intake");
                  setPatientSubView("landing");
                }}
              />
            )}

            {/* Intake Submission Success Screen */}
            {patientSubView === "intake" && checkoutStep === "success" && selectedCase && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Intake Submitted Successfully</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Your assessment file <strong className="text-white font-mono">{selectedCase.id}</strong> is registered. An active clinician is analyzing your metabolic checkups.
                  </p>
                </div>

                <div className="p-4 bg-black rounded-xl border border-zinc-900 text-left space-y-2 text-xs">
                  <p className="text-[#E5C158] font-bold flex items-center gap-1 font-sans">
                    <Sparkles className="w-3.5 h-3.5" /> AI Clinical Assistant:
                  </p>
                  <p className="text-zinc-400 italic leading-relaxed font-sans">
                    {selectedCase.ai_summary ? `${selectedCase.ai_summary.substring(0, 140)}...` : "Summarizing intake profile..."}
                  </p>
                </div>

                <button
                  onClick={() => setPatientSubView("portal")}
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5"
                >
                  Enter Secure Patient Dashboard <span className="font-mono text-[10px] opacity-80">(Redirecting in {successCountdown}s)</span>
                </button>
              </div>
            )}

            {/* Patient Secure Dashboard Vault */}
            {patientSubView === "portal" && (
              <PatientPortal 
                selectedCase={selectedCase}
                setSelectedCase={setSelectedCase}
                allCases={searchPhone ? consultationApi.getByPatientPhone(searchPhone) : (patientSession ? consultationApi.getByPatientPhone(patientSession.phone) : [])}
                searchPhone={searchPhone}
                setSearchPhone={setSearchPhone}
                onSearchPortal={handleSearchPatientPortal}
                patientMessage={patientMessage}
                setPatientMessage={setPatientMessage}
                onSendPatientMessage={handleSendPatientMsg}
                onStartNewCase={() => setPatientSubView("landing")}
                onSelectNewCondition={handleStartIntake}
                onSelectSymptom={handleSymptomSelect}
                formatDate={formatDate}
                formatNaira={formatNaira}
                onLogout={handlePatientLogout}
                onDeleteAccount={handleDeleteAccount}
                onUpdateProfile={handleUpdateProfile}
                patientName={patientSession?.name || ""}
                patientPhone={patientSession?.phone || ""}
                patientEmail={patientSession?.email || ""}
                patientState={patientSession?.state || ""}
                activeSidebarTab={patientPortalTab}
                setActiveSidebarTab={setPatientPortalTab}
              />
            )}

          </div>
        )}

        {/* II. CLINICIAN ACCESS FLOW */}
        {activeTab === "clinician" && (
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
              <span className="text-xs font-mono text-zinc-400">Decrypting Secure Clinician Console...</span>
            </div>
          }>
            <ClinicianArea 
              currentDoctor={currentDoctor}
              setCurrentDoctor={setCurrentDoctor}
              docView={docView}
              setDocView={setDocView}
              isRegistering={isRegistering}
              setIsRegistering={setIsRegistering}
              docFolio={docFolio}
              setDocFolio={setDocFolio}
              docPin={docPin}
              setDocPin={setDocPin}
              docRegName={docRegName}
              setDocRegName={setDocRegName}
              docRegPhone={docRegPhone}
              setDocRegPhone={setDocRegPhone}
              docRegFolio={docRegFolio}
              setDocRegFolio={setDocRegFolio}
              docRegAplYear={docRegAplYear}
              setDocRegAplYear={setDocRegAplYear}
              docRegPin={docRegPin}
              setDocRegPin={setDocRegPin}
              docError={docError}
              setDocError={setDocError}
              docSuccess={docSuccess}
              setDocSuccess={setDocSuccess}
              selectedDoctorCase={selectedDoctorCase}
              setSelectedDoctorCase={setSelectedDoctorCase}
              doctorMessage={doctorMessage}
              setDoctorMessage={setDoctorMessage}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              aiDraft={aiDraft}
              setAiDraft={setAiDraft}
              isGeneratingDraft={isGeneratingDraft}
              setIsGeneratingDraft={setIsGeneratingDraft}
              closingNotes={closingNotes}
              setClosingNotes={setClosingNotes}
              closingPrescription={closingPrescription}
              setClosingPrescription={setClosingPrescription}
              showCloseModal={showCloseModal}
              setShowCloseModal={setShowCloseModal}
              payoutAmount={payoutAmount}
              setPayoutAmount={setPayoutAmount}
              payoutBank={payoutBank}
              setPayoutBank={setPayoutBank}
              payoutAccount={payoutAccount}
              setPayoutAccount={setPayoutAccount}
              payoutMsg={payoutMsg}
              setPayoutMsg={setPayoutMsg}
              onDoctorLogin={handleDoctorLogin}
              onDoctorRegister={handleDoctorRegister}
              onDoctorClaimCase={handleDoctorClaimCase}
              onSendDoctorMessage={handleSendDoctorMsg}
              onGenerateAIDraft={handleGenerateAIDraft}
              onCompleteConsultation={handleCompleteConsultation}
              onPayoutRequest={handlePayoutRequestSubmit}
              formatDate={formatDate}
              formatNaira={formatNaira}
              triggerRefresh={triggerRefresh}
            />
          </React.Suspense>
        )}

        {/* III. OPERATIVE ADMIN FLOW */}
        {activeTab === "admin" && (
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
              <span className="text-xs font-mono text-zinc-400">Decrypting Secure Administrative Console...</span>
            </div>
          }>
            <AdminOffice 
              adminPin={adminPin}
              setAdminPin={setAdminPin}
              isAdminAuthenticated={isAdminAuthenticated}
              setIsAdminAuthenticated={setIsAdminAuthenticated}
              adminView={adminView}
              setAdminView={setAdminView}
              onAdminLogin={handleAdminLogin}
              onAdminVerifyDoctor={handleAdminVerifyDoctor}
              onAdminApprovePayout={handleAdminApprovePayout}
              formatDate={formatDate}
              formatNaira={formatNaira}
              triggerRefresh={triggerRefresh}
            />
          </React.Suspense>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900/40 bg-zinc-950/20 py-3.5 px-4 text-center text-[9px] text-zinc-600 font-mono selection:bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-left">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} <span className="font-bold">PrivyDoc</span> • <span className="text-zinc-500 font-sans font-medium">Verified Telehealth</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-zinc-500 text-[9.5px]">
            <button onClick={() => setLegalModalOpen("privacy")} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("terms")} className="hover:text-zinc-300 transition-colors">Terms of Use</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("medical")} className="hover:text-zinc-300 transition-colors">Disclaimer</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("ndpr")} className="hover:text-zinc-300 transition-colors">NDPR</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("refund")} className="hover:text-zinc-300 transition-colors">Refunds</button>
          </div>
          <p className="text-[8.5px] opacity-75 text-zinc-600 hover:text-zinc-500 transition-colors">AES-256 Tunnel • MDCN Telemedicine Compliant</p>
        </div>
      </footer>
    </div>

    {/* MOBILE BOTTOM NAVIGATION (< 768px only) */}
    <div className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-[95] h-16 bg-black/95 backdrop-blur-md border-t border-zinc-900 items-center justify-around px-2">
      {sidebarNavItems.length > 0 ? (
        sidebarNavItems.slice(0, 5).map((item) => (
          <button
            key={item.label}
            onClick={async () => {
              if (!(await confirmLeaveIntakeIfNeeded())) return;
              item.onClick();
            }}
            className={`flex flex-col items-center gap-1 px-1.5 py-1 text-[9px] font-bold transition-all ${
              item.active ? "text-[#E5C158]" : "text-zinc-500"
            }`}
          >
            {item.icon}
            <span className="truncate max-w-[56px]">{item.label}</span>
          </button>
        ))
      ) : (
        <button
          onClick={() => {
            setActiveTab("patient");
            setPatientSubView("landing");
          }}
          className="flex flex-col items-center gap-1 px-1.5 py-1 text-[9px] font-bold text-zinc-500"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>
      )}
    </div>

    {/* LEGAL MODALS PORTAL OVERLAY */}
    {legalModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#d4af37]" />
          <h3 className="text-sm font-bold text-[#E5C158] uppercase tracking-wider font-mono border-b border-zinc-900 pb-2">
            {legalModalOpen === "privacy" && "Confidential Privacy Policy"}
            {legalModalOpen === "terms" && "Terms & Clinical Agreement"}
            {legalModalOpen === "medical" && "Clinical & Medical Disclaimer"}
            {legalModalOpen === "ndpr" && "NDPR Data Protection Standard"}
            {legalModalOpen === "refund" && "Patient Refund Guidelines"}
          </h3>
          <div className="text-xs text-zinc-400 leading-relaxed max-h-80 overflow-y-auto space-y-3 font-sans">
            {legalModalOpen === "privacy" && (
              <>
                <p>PrivyDoc is operated by <strong>9JaClinic Limited</strong>, a digital health company registered in Nigeria (est. 2021).</p>
                <p>We process only the absolute minimum data required for medical reviews: first name, age, phone number, state, and secure clinical questionnaire responses.</p>
                <p>Under NDPA 2023, your medical details are fully encrypted and only authorized medical doctors verified by the MDCN can access your clinical files. No public disclosure, ever.</p>
              </>
            )}
            {legalModalOpen === "terms" && (
              <>
                <p>By using PrivyDoc, you affirm that you are a male individual residing in Nigeria, aged 18 or older.</p>
                <p>This is a digital-only telemedicine consultation. Reviewing doctors exercise independent clinical judgment to issue digital, cryptographic prescription sheets.</p>
                <p>We do not issue printed paper prescription papers. Fees are non-refundable once an assigned medical practitioner has commenced review of your clinical file.</p>
              </>
            )}
            {legalModalOpen === "medical" && (
              <>
                <p>PrivyDoc is strictly for stable, non-emergency conditions. If you are experiencing chest pain, severe breathing issues, or an acute emergency, please proceed immediately to the nearest physical hospital.</p>
                <p>Consultations are conducted asynchronously using syndromic management protocols. No physical clinical examination is performed. Doctors on this platform are MDCN-licensed. Their practice licence covers patients residing in Nigeria only.</p>
              </>
            )}
            {legalModalOpen === "ndpr" && (
              <>
                <p>PrivyDoc complies fully with the Nigeria Data Protection Act (NDPA) 2023 and NDPR frameworks.</p>
                <p>Your medical questionnaires, personal descriptors, and consultation history are protected with 256-bit Advanced Encryption Standard (AES) protocols on clinical server tunnels.</p>
              </>
            )}
            {legalModalOpen === "refund" && (
              <>
                <p>Due to the direct provision of clinical services by licensed medical physicians, consultation fees ({formatNaira(pricingApi.getById("base_consultation")?.price ?? 7500)} base, {formatNaira(pricingApi.getById("review_consultation")?.price ?? 3500)} review) are non-refundable once a physician claims your file.</p>
                <p>If your payment succeeded but did not update your secure vault due to an internet drop or technical failure, please email <strong>hello@privydoc.com.ng</strong> with transaction details for immediate assistance.</p>
              </>
            )}
          </div>
          <button 
            onClick={() => setLegalModalOpen(null)}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors border border-zinc-800"
          >
            Close Document
          </button>
        </div>
      </div>
    )}

    {/* BRANDED PRE-PERMISSION MODAL */}
    {permissionModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-hidden text-zinc-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4af37] to-[#b8860b]" />
          
          {(
            geoCheckState === "outside" ? (
              <>
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/15 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/5">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    OUTSIDE SERVICE JURISDICTION
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
                    Doctors on this platform are MDCN-licensed. Their practice licence covers patients residing in Nigeria only.
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                    Questions? Contact us at <strong className="text-zinc-300">help@privydoc.com.ng</strong>.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => {
                      setPermissionModal(null);
                      setPendingCondition(null);
                      setGeoCheckState("ask");
                    }}
                    className="w-full py-2.5 bg-transparent hover:bg-zinc-900/50 text-zinc-500 hover:text-zinc-400 font-bold text-xs rounded-xl transition-colors"
                  >
                    Exit
                  </button>
                </div>
              </>
            ) : (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  MDCN CLINICAL COMPLIANCE CHECK
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
                  Doctors on this platform are MDCN-licensed. Their practice licence covers patients residing in Nigeria only.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    localStorage.setItem("privydoc_geo_verified", JSON.stringify({ verified: true, selfDeclared: true, timestamp: Date.now() }));
                    setPermissionModal(null);
                    setGeoCheckState("ask");
                    if (pendingCondition) {
                      const cond = pendingCondition;
                      setPendingCondition(null);
                      proceedWithIntake(cond);
                    }
                  }}
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#d4af37]/5"
                >
                  I am currently in Nigeria — Continue
                </button>
                <button
                  onClick={() => setGeoCheckState("outside")}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 font-bold text-xs rounded-xl transition-colors border border-zinc-800"
                >
                  I am outside Nigeria
                </button>
              </div>
            </>
            )
          )}
        </div>
      </div>
    )}
    {/* PWA Custom Install Banner */}
    {showPwaBanner && (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-[420px] bg-zinc-950 border-2 border-[#d4af37]/20 p-5 rounded-2xl shadow-2xl z-50 animate-fade-in flex flex-col gap-3.5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 flex items-center justify-center border border-[#d4af37]/20 shrink-0 text-[#d4af37]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Install PrivyDoc App
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
              Install PrivyDoc for faster, private access to your secure medical vault.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={handlePwaDismiss}
            className="px-4 py-2 text-zinc-400 hover:text-white font-bold text-xs rounded-lg transition-colors border border-zinc-800 hover:bg-zinc-900"
          >
            Not Now
          </button>
          <button
            onClick={handlePwaInstall}
            className="px-4 py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-lg transition-colors shadow-lg shadow-[#d4af37]/10"
          >
            Install App
          </button>
        </div>
      </div>
    )}

    {/* Floating Scroll to Top / Bottom Helper Buttons */}
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5">
      {scrollY > 200 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to Top"
          className="w-10 h-10 bg-zinc-950/90 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-zinc-900 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group backdrop-blur-md"
        >
          <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
      {scrollY < ((document.documentElement?.scrollHeight || 1000) - window.innerHeight - 200) && (
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
          title="Scroll to Bottom"
          className="w-10 h-10 bg-zinc-950/90 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-zinc-900 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group backdrop-blur-md"
        >
          <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
        </button>
      )}
    </div>
    <ToastContainer />
    <ConfirmModal />
  </div>
);
}
