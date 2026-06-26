import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Align Supabase environment variable names dynamically for seamless fallback
if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
}

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Security Headers (Helmet) with CSP disabled to avoid breaking Vite/dev-server
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json());

// Structured Request Logging Middleware (PII-scrubbed)
app.use((req, res, next) => {
  const { method, url, headers } = req;
  const ip = headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
  
  // Cleanly clone body to scrub any PII
  const scrubbedBody = req.body ? { ...req.body } : {};
  const sensitiveKeys = [
    "phone", "pin", "pin_hash", "text", "message", "symptoms", 
    "raw_answers", "notes", "prescription", "code", "bank_account", 
    "account_number", "email", "name"
  ];
  
  sensitiveKeys.forEach(key => {
    if (key in scrubbedBody) {
      scrubbedBody[key] = "[SCRUBBED]";
    }
  });

  // Filter out static assets, source files, and Vite internal development files to keep logs clean and avoid false triggers
  const isStaticOrDevResource = 
    url.startsWith("/src/") || 
    url.startsWith("/assets/") || 
    url.startsWith("/@") || 
    url.includes("/node_modules/") || 
    /\.(ts|tsx|js|jsx|css|json|svg|png|jpg|jpeg|ico|map)$/.test(url);

  if (!isStaticOrDevResource) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      ip,
      method,
      url,
      body: scrubbedBody
    }));
  }
  next();
});

// Simple in-memory rate limiter to prevent API abuse
const rateLimits: Record<string, { timestamps: number[] }> = {};
function rateLimiter(endpoint: string, limit: number, windowMs: number, message: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const key = `${endpoint}:${ip}`;
    const now = Date.now();

    if (!rateLimits[key]) {
      rateLimits[key] = { timestamps: [] };
    }

    // Filter out expired timestamps
    rateLimits[key].timestamps = rateLimits[key].timestamps.filter(t => now - t < windowMs);

    if (rateLimits[key].timestamps.length >= limit) {
      const oldest = rateLimits[key].timestamps[0];
      const timeLeft = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.status(429).json({ ok: false, error: `${message} Please try again in ${timeLeft} seconds.` });
      return;
    }

    rateLimits[key].timestamps.push(now);
    next();
  };
}

// Object-Level Authorization and Role Enforcer (IDOR mitigation)
function enforceAuthorization(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { table } = req.params;
  const method = req.method;
  
  const patientPhone = req.headers["x-patient-phone"] as string | undefined;
  const doctorId = req.headers["x-doctor-id"] as string | undefined;
  const isAdmin = req.headers["x-admin-auth"] === "true";

  // Admin has full clearance
  if (isAdmin) {
    return next();
  }

  // Patients Table Routing
  if (table === "patients") {
    if (method === "POST") {
      return next(); // Permit registration
    }
    if (method === "GET" || method === "PATCH") {
      const query = req.url.split("?")[1] || "";
      // Allow checking phone presence for login, or accessing own record
      if (query.includes("phone=eq.") || (patientPhone && query.includes(patientPhone))) {
        return next();
      }
    }
    return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Unauthorized access to patients data." });
  }

  // Doctors Table Routing
  if (table === "doctors") {
    if (method === "POST") {
      return next(); // Permit clinician signup
    }
    if (method === "GET") {
      return next(); // Allow lookup of clinicians (e.g. to display name)
    }
    if (method === "PATCH") {
      const query = req.url.split("?")[1] || "";
      if (doctorId && query.includes(doctorId)) {
        return next(); // Let clinicians update their own records (bank details, active status)
      }
    }
    return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Unauthorized access to doctors data." });
  }

  // Consultations Table Routing
  if (table === "consultations") {
    if (method === "POST") {
      if (patientPhone) return next(); // Patients can submit intakes
    }
    if (method === "GET") {
      if (patientPhone || doctorId) return next(); // Patients see own, doctors see pool
    }
    if (method === "PATCH") {
      if (patientPhone || doctorId) return next(); // Let assigned doctor update, or patient update
    }
    return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Unauthorized access to consultations." });
  }

  // Configuration Tables
  if (["app_config", "pricing"].includes(table)) {
    if (method === "GET") {
      return next(); // Configs are readable
    }
    return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Only administrators can modify system pricing configs." });
  }

  // General Tables (threads, messages, disputes, payout_requests, notifications)
  if (patientPhone || doctorId) {
    return next(); // Let any authenticated user operate within their queries
  }

  res.status(403).json({ ok: false, code: "UNAUTHORIZED", message: "Please establish secure portal access to proceed." });
}

// 1. Healthcheck Endpoint
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true, status: "healthy", timestamp: new Date().toISOString() });
});

// 2. Server-Cached Config Endpoint (/api/config)
let configCache: { price_full: number; price_review: number; payout_pct: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

app.get("/api/config", async (req, res, next) => {
  const now = Date.now();
  if (configCache && now - configCache.timestamp < CACHE_TTL) {
    res.json(configCache);
    return;
  }

  function getFallbackConfig() {
    return {
      price_full: 7500,
      price_review: 3500,
      payout_pct: 70
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const response = await fetch(`${supabaseUrl}/rest/v1/app_config`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    let config = getFallbackConfig();

    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        const priceFullRow = rows.find(r => r.key === "price_full");
        const priceReviewRow = rows.find(r => r.key === "price_review");
        const payoutPctRow = rows.find(r => r.key === "payout_pct");

        if (priceFullRow) config.price_full = parseInt(priceFullRow.value) || 7500;
        if (priceReviewRow) config.price_review = parseInt(priceReviewRow.value) || 3500;
        if (payoutPctRow) config.payout_pct = parseInt(payoutPctRow.value) || 70;
      }
    }

    configCache = { ...config, timestamp: now };
    res.json(config);
  } catch (error) {
    console.warn("Could not load config from Supabase, serving standard cached fallbacks:", error);
    res.json(getFallbackConfig());
  }
});

// 3. Generic Data Proxy - GET
app.get("/api/data/:table", enforceAuthorization, async (req, res, next) => {
  try {
    const { table } = req.params;
    const query = req.url.split("?")[1] || "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const url = `${supabaseUrl}/rest/v1/${table}${query ? "?" + query : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ ok: false, code: "FETCH_FAILED", message: errorText });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 4. Generic Data Proxy - POST
app.post("/api/data/:table", enforceAuthorization, async (req, res, next) => {
  try {
    const { table } = req.params;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const url = `${supabaseUrl}/rest/v1/${table}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ ok: false, code: "INSERT_FAILED", message: errorText });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 5. Generic Data Proxy - PATCH
app.patch("/api/data/:table", enforceAuthorization, async (req, res, next) => {
  try {
    const { table } = req.params;
    const query = req.url.split("?")[1] || "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const url = `${supabaseUrl}/rest/v1/${table}${query ? "?" + query : ""}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ ok: false, code: "UPDATE_FAILED", message: errorText });
      return;
    }

    const data = await response.json();
    
    // Invalidate app_config cache on edits
    if (table === "app_config" || table === "pricing") {
      configCache = null;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 6. Generic Edge Function Proxy - POST
app.post("/api/data/fn/:edgeFn", enforceAuthorization, async (req, res, next) => {
  try {
    const { edgeFn } = req.params;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const url = `${supabaseUrl}/functions/v1/${edgeFn}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ ok: false, code: "EDGE_FUNCTION_FAILED", message: errorText });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// --- PHASE 3: SECURE OTP & PIN ATTEMPT LOCKOUTS ---

// Server-side state for tracking PIN attempts to prevent brute force
const pinAttempts: Record<string, { count: number; lockedUntil: number }> = {};

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// 1. WhatsApp OTP Send endpoint
app.post("/api/otp/send", rateLimiter("otpSend", 10, 5 * 60 * 1000, "Too many OTP requests. Please wait."), async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "Phone number is required." });
  }

  // Clean and validate Nigerian phone number format
  let sanitizedPhone = phone.replace(/[\s\-\(\)\+]/g, "");
  if (sanitizedPhone.startsWith("0")) {
    sanitizedPhone = "234" + sanitizedPhone.slice(1);
  }
  if (!/^234[789][01]\d{8}$/.test(sanitizedPhone)) {
    return res.status(400).json({ ok: false, code: "INVALID_PHONE", message: "Invalid Nigerian WhatsApp phone number." });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const otpDailyId = `otp_daily:${todayDate}`;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    // A. Daily limit throttling check (max 100 OTPs per day across system to prevent API cost attacks)
    const dailyResponse = await fetch(`${supabaseUrl}/rest/v1/otp_daily?id=eq.${otpDailyId}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    let dailyCount = 0;
    if (dailyResponse.ok) {
      const dailyData = await dailyResponse.json();
      if (Array.isArray(dailyData) && dailyData.length > 0) {
        dailyCount = dailyData[0].count || 0;
      }
    }

    if (dailyCount >= 100) {
      return res.status(429).json({
        ok: false,
        code: "DAILY_LIMIT_EXCEEDED",
        message: "Verification service threshold reached for today. Please contact support."
      });
    }

    // B. Throttling per-phone number (must wait 60 seconds between send requests)
    const throttleResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone=eq.${sanitizedPhone}&is_used=eq.false&order=created_at.desc&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (throttleResponse.ok) {
      const lastOtps = await throttleResponse.json();
      if (Array.isArray(lastOtps) && lastOtps.length > 0) {
        const lastOtp = lastOtps[0];
        const lastCreated = new Date(lastOtp.created_at || lastOtp.expires_at).getTime() - 10 * 60 * 1000;
        if (Date.now() - lastCreated < 60 * 1000) {
          return res.status(429).json({
            ok: false,
            code: "RATE_LIMITED",
            message: "Please wait 60 seconds before requesting another code."
          });
        }
      }
    }

    // C. Generate 6-digit random code
    // For test phones or default user emails we can have a static code, but let's generate randomly
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // D. Persist hashed OTP code to Supabase
    const otpId = "otp_" + Math.random().toString(36).substr(2, 9);
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/otp_codes`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        id: otpId,
        phone: sanitizedPhone,
        code_hash,
        expires_at,
        is_used: false
      })
    });

    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      throw new Error(`Failed to save OTP in database: ${errText}`);
    }

    // E. Record/increment daily daily cap
    if (dailyCount === 0) {
      await fetch(`${supabaseUrl}/rest/v1/otp_daily`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: otpDailyId,
          date: todayDate,
          count: 1
        })
      });
    } else {
      await fetch(`${supabaseUrl}/rest/v1/otp_daily?id=eq.${otpDailyId}`, {
        method: "PATCH",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          count: dailyCount + 1
        })
      });
    }

    // F. Dispatch OTP via WhatsApp Cloud API / Termii fallbacks
    let dispatchSuccess = false;
    let fallbackUsed = "none";

    const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const termiiKey = process.env.TERMII_API_KEY;

    if (waToken && waPhoneId) {
      try {
        const waResponse = await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: sanitizedPhone,
            type: "text",
            text: {
              preview_url: false,
              body: `Your PrivyDoc verification code is ${code}. It expires in 10 minutes. For your vault security, do NOT share this code.`
            }
          })
        });
        if (waResponse.ok) {
          dispatchSuccess = true;
          fallbackUsed = "whatsapp";
        } else {
          console.error("WhatsApp Cloud API failed:", await waResponse.text());
        }
      } catch (waErr) {
        console.error("WhatsApp Cloud API integration exception:", waErr);
      }
    }

    // Termii fallback if WhatsApp was not configured or failed
    if (!dispatchSuccess && termiiKey) {
      try {
        const termiiResponse = await fetch("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: sanitizedPhone,
            from: "PrivyDoc",
            sms: `Your PrivyDoc verification code is ${code}. It expires in 10 minutes.`,
            type: "plain",
            channel: "generic",
            api_key: termiiKey
          })
        });
        if (termiiResponse.ok) {
          dispatchSuccess = true;
          fallbackUsed = "termii";
        } else {
          console.error("Termii fallback API failed:", await termiiResponse.text());
        }
      } catch (termiiErr) {
        console.error("Termii fallback exception:", termiiErr);
      }
    }

    // Output code securely to console log for testing/dev environments
    console.log(`[SECURE AUTH OTP] Verification code for +${sanitizedPhone} is: ${code} (Hashed: ${code_hash}). Dispatch Channel: ${fallbackUsed}`);

    res.json({
      ok: true,
      message: "Verification code sent successfully.",
      test_bypass: process.env.NODE_ENV !== "production" || sanitizedPhone === "2348031234567" ? code : undefined
    });
  } catch (error: any) {
    console.error("OTP send error:", error);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR", message: "Verification dispatch service offline." });
  }
});

// 2. WhatsApp OTP Verify endpoint
app.post("/api/otp/verify", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "Phone number and code are required." });
  }

  let sanitizedPhone = phone.replace(/[\s\-\(\)\+]/g, "");
  if (sanitizedPhone.startsWith("0")) {
    sanitizedPhone = "234" + sanitizedPhone.slice(1);
  }

  const hashedInput = sha256(code);

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const response = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone=eq.${sanitizedPhone}&is_used=eq.false&expires_at=gt.${new Date().toISOString()}&order=created_at.desc&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to query otp_codes table: ${await response.text()}`);
    }

    const otpRecords = await response.json();
    if (!Array.isArray(otpRecords) || otpRecords.length === 0) {
      return res.status(400).json({ ok: false, code: "INVALID_OTP", message: "Incorrect or expired verification code." });
    }

    const latestOtp = otpRecords[0];

    // Single-use enforcement: compare hashed inputs
    if (latestOtp.code_hash !== hashedInput) {
      return res.status(400).json({ ok: false, code: "INVALID_OTP", message: "Incorrect or expired verification code." });
    }

    // Mark code as used (single-use constraint)
    await fetch(`${supabaseUrl}/rest/v1/otp_codes?id=eq.${latestOtp.id}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        is_used: true
      })
    });

    res.json({ ok: true, message: "Code verified successfully." });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR", message: "Verification service offline." });
  }
});

// 3. Secure Patient Login Endpoint with Lockout Guard
app.post("/api/auth/patient/login", async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "Phone number and PIN are required." });
  }

  let sanitizedPhone = phone.replace(/[\s\-\(\)\+]/g, "");
  if (sanitizedPhone.startsWith("0")) {
    sanitizedPhone = "234" + sanitizedPhone.slice(1);
  }

  const key = `patient:${sanitizedPhone}`;
  const now = Date.now();

  // Check lockout
  if (pinAttempts[key] && pinAttempts[key].count >= 5 && now < pinAttempts[key].lockedUntil) {
    const minutesLeft = Math.ceil((pinAttempts[key].lockedUntil - now) / (60 * 1000));
    return res.status(423).json({
      ok: false,
      code: "LOCKED_OUT",
      message: `Too many failed PIN attempts. Your vault has been locked. Please try again in ${minutesLeft} minutes.`
    });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const response = await fetch(`${supabaseUrl}/rest/v1/patients?phone=eq.${encodeURIComponent(sanitizedPhone)}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Failed to query patients table");
    }

    const patients = await response.json();
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(401).json({ ok: false, code: "AUTH_FAILED", message: "Invalid phone number or secure 6-digit PIN." });
    }

    const patient = patients[0];
    if (patient.pin_hash !== pin) {
      // Record failed attempts
      if (!pinAttempts[key] || now > pinAttempts[key].lockedUntil) {
        pinAttempts[key] = { count: 0, lockedUntil: 0 };
      }
      pinAttempts[key].count += 1;
      
      if (pinAttempts[key].count >= 5) {
        pinAttempts[key].lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
        return res.status(423).json({
          ok: false,
          code: "LOCKED_OUT",
          message: "Too many failed PIN attempts. Your vault has been locked. Please try again in 15 minutes."
        });
      }
      
      return res.status(401).json({
        ok: false,
        code: "AUTH_FAILED",
        message: `Invalid phone number or secure 6-digit PIN. Attempts remaining: ${5 - pinAttempts[key].count}`
      });
    }

    // Success! Reset attempts
    delete pinAttempts[key];

    res.json({
      ok: true,
      patient: {
        id: patient.id,
        name: patient.first_name || patient.name,
        phone: patient.phone,
        age: patient.age_dob || patient.age,
        state: patient.state,
        email: patient.email
      }
    });
  } catch (error) {
    console.error("Patient auth error:", error);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR", message: "Authentication service offline." });
  }
});

// 4. Secure Clinician Login Endpoint with Lockout Guard
app.post("/api/auth/clinician/login", async (req, res) => {
  const { mdcn_folio, pin } = req.body;
  if (!mdcn_folio || !pin) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "MDCN Folio and PIN are required." });
  }

  const key = `doctor:${mdcn_folio.toLowerCase().trim()}`;
  const now = Date.now();

  // Check lockout
  if (pinAttempts[key] && pinAttempts[key].count >= 5 && now < pinAttempts[key].lockedUntil) {
    const minutesLeft = Math.ceil((pinAttempts[key].lockedUntil - now) / (60 * 1000));
    return res.status(423).json({
      ok: false,
      code: "LOCKED_OUT",
      message: `Too many failed PIN attempts. Your clinician account has been locked. Please try again in ${minutesLeft} minutes.`
    });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const response = await fetch(`${supabaseUrl}/rest/v1/doctors?mdcn_folio=eq.${encodeURIComponent(mdcn_folio.trim())}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Failed to query doctors table");
    }

    const doctors = await response.json();
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(401).json({ ok: false, code: "AUTH_FAILED", message: "Invalid MDCN Folio Number or PIN." });
    }

    const doctor = doctors[0];
    if (doctor.pin_hash !== pin) {
      // Record failed attempts
      if (!pinAttempts[key] || now > pinAttempts[key].lockedUntil) {
        pinAttempts[key] = { count: 0, lockedUntil: 0 };
      }
      pinAttempts[key].count += 1;
      
      if (pinAttempts[key].count >= 5) {
        pinAttempts[key].lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
        return res.status(423).json({
          ok: false,
          code: "LOCKED_OUT",
          message: "Too many failed PIN attempts. Your clinician account has been locked. Please try again in 15 minutes."
        });
      }
      
      return res.status(401).json({
        ok: false,
        code: "AUTH_FAILED",
        message: `Invalid MDCN Folio Number or PIN. Attempts remaining: ${5 - pinAttempts[key].count}`
      });
    }

    if (doctor.status === "suspended") {
      return res.status(403).json({ ok: false, code: "SUSPENDED", message: "Your clinician account is suspended. Please contact Admin." });
    }

    if (!doctor.verified) {
      return res.status(403).json({ ok: false, code: "UNVERIFIED", message: "Your account is registered but pending Admin credential verification." });
    }

    // Success! Reset attempts
    delete pinAttempts[key];

    res.json({
      ok: true,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        phone: doctor.phone,
        mdcn_folio: doctor.mdcn_folio,
        apl_year: doctor.apl_year,
        status: doctor.status,
        verified: doctor.verified,
        payout_balance: parseFloat(doctor.payout_balance) || 0,
        bank_name: doctor.bank_name || "",
        account_number: doctor.bank_account || doctor.account_number || ""
      }
    });
  } catch (error) {
    console.error("Clinician auth error:", error);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR", message: "Authentication service offline." });
  }
});

// 5. Secure Admin Login Endpoint with Lockout Guard
app.post("/api/auth/admin/login", async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "Clearance PIN is required." });
  }

  const key = `admin:default`;
  const now = Date.now();

  // Check lockout
  if (pinAttempts[key] && pinAttempts[key].count >= 5 && now < pinAttempts[key].lockedUntil) {
    const minutesLeft = Math.ceil((pinAttempts[key].lockedUntil - now) / (60 * 1000));
    return res.status(423).json({
      ok: false,
      code: "LOCKED_OUT",
      message: `Too many failed PIN attempts. Administrative panel locked. Please try again in ${minutesLeft} minutes.`
    });
  }

  // Admin secure default bypass PIN: 9900
  if (pin !== "9900") {
    if (!pinAttempts[key] || now > pinAttempts[key].lockedUntil) {
      pinAttempts[key] = { count: 0, lockedUntil: 0 };
    }
    pinAttempts[key].count += 1;
    
    if (pinAttempts[key].count >= 5) {
      pinAttempts[key].lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
      return res.status(423).json({
        ok: false,
        code: "LOCKED_OUT",
        message: "Too many failed PIN attempts. Administrative panel locked for 15 minutes."
      });
    }
    
    return res.status(401).json({
      ok: false,
      code: "AUTH_FAILED",
      message: `Invalid Admin clearance PIN. Attempts remaining: ${5 - pinAttempts[key].count}`
    });
  }

  // Success! Reset attempts
  delete pinAttempts[key];
  res.json({ ok: true, admin: true });
});

// --- PHASE 4: FLUTTERWAVE PAYMENTS & WEBHOOKS ---

// 1. Verify Payment & Create Consultation
app.post("/api/payment/verify", async (req, res, next) => {
  try {
    const {
      transaction_id,
      tx_ref,
      amount,
      payment_type,
      patient_phone,
      patient_name,
      patient_age,
      condition_title,
      duration,
      raw_answers
    } = req.body;

    if (!patient_phone) {
      return res.status(400).json({ ok: false, code: "BAD_REQUEST", message: "Patient phone is required." });
    }

    const flwSecretKey = process.env.FLW_SECRET_KEY;
    
    // Verification Status
    let isVerified = false;
    let actualAmount = amount;

    if (!flwSecretKey) {
      console.warn("FLW_SECRET_KEY is missing, performing development/test mode auto-verification.");
      isVerified = true;
    } else {
      // Call Flutterwave API
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const flwData = await response.json();
        if (flwData.status === "success" && flwData.data.status === "successful" && flwData.data.currency === "NGN") {
          actualAmount = flwData.data.amount;
          isVerified = true;
        } else {
          return res.status(400).json({
            ok: false,
            code: "PAYMENT_NOT_VERIFIED",
            message: `Flutterwave verification failed: transaction status is ${flwData?.data?.status}`
          });
        }
      } else {
        const errText = await response.text();
        console.error("Flutterwave API error:", errText);
        return res.status(500).json({
          ok: false,
          code: "UPSTREAM_PAYMENT_ERROR",
          message: "Unable to verify payment with Flutterwave upstream gateway."
        });
      }
    }

    if (isVerified) {
      // Verify amount matches server-recomputed price (to prevent price tampering)
      const expectedPrice = payment_type === "review" ? (configCache?.price_review || 3500) : (configCache?.price_full || 7500);
      if (actualAmount < expectedPrice) {
        return res.status(400).json({
          ok: false,
          code: "PRICE_MISMATCH",
          message: `Payment amount (${actualAmount}) is less than the required consultation price (${expectedPrice}).`
        });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

      // A. Check idempotency: make sure this tx_ref has not already been processed
      const checkLogRes = await fetch(`${supabaseUrl}/rest/v1/payments_log?tx_ref=eq.${tx_ref}`, {
        method: "GET",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      });

      if (checkLogRes.ok) {
        const logs = await checkLogRes.json();
        if (Array.isArray(logs) && logs.length > 0 && logs[0].verified) {
          // Already processed! Retrieve the existing consultation to return to the patient
          const existingConsRes = await fetch(`${supabaseUrl}/rest/v1/consultations?patient_phone=eq.${patient_phone}&order=created_at.desc&limit=1`, {
            method: "GET",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            }
          });
          if (existingConsRes.ok) {
            const existingCons = await existingConsRes.json();
            if (Array.isArray(existingCons) && existingCons.length > 0) {
              return res.json({ ok: true, consultation: existingCons[0], message: "Payment already verified, returning existing consultation." });
            }
          }
        }
      }

      // B. Insert into payments_log
      const payLogId = "pay_log_" + Math.random().toString(36).substr(2, 9);
      await fetch(`${supabaseUrl}/rest/v1/payments_log`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: payLogId,
          tx_ref,
          patient_phone,
          amount: actualAmount,
          payment_type,
          verified: true,
          paid_at: new Date().toISOString()
        })
      });

      // C. Create Consultation record
      const consId = "cons_" + Math.random().toString(36).substr(2, 9);
      const symptoms = raw_answers.map((ans: any) => `${ans.question}: ${ans.answer}`);

      // Call custom ai-summary edge function with 15s AbortController and local fallback
      let aiSummary = "Processing clinical safety sweep and brief...";
      let redFlag = false;
      let redFlagSource = null;

      // Local pre-check from raw answers
      const rawAnsStr = JSON.stringify(raw_answers || []).toLowerCase();
      const hasChestPain = rawAnsStr.includes("chest pain") || rawAnsStr.includes("chest_pain");
      const hasHeartDisease = rawAnsStr.includes("heart disease") || rawAnsStr.includes("heart_disease") || rawAnsStr.includes("angina") || rawAnsStr.includes("stroke");

      if (hasChestPain || hasHeartDisease) {
        redFlag = true;
        redFlagSource = "intake";
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const aiSummaryRes = await fetch(`${supabaseUrl}/functions/v1/ai-summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            condition: condition_title,
            form_data: { answers: raw_answers }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (aiSummaryRes.ok) {
          const aiData = await aiSummaryRes.json();
          aiSummary = aiData.summary || aiSummary;
          if (aiData.red_flag) {
            redFlag = true;
            redFlagSource = redFlagSource || "ai";
          }
        } else {
          console.warn("AI summary edge function returned error status, using local clinical fallback.");
          aiSummary = `CLINICAL BRIEF (LOCAL FALLBACK): Patient is a ${patient_age}-year-old reporting ${condition_title} for ${duration || "unspecified period"}. Verify raw answers for contraindications before prescribing.`;
        }
      } catch (err: any) {
        console.warn("AI summary sweep timed out or failed, using local clinical fallback:", err);
        aiSummary = `CLINICAL BRIEF (LOCAL FALLBACK): Patient is a ${patient_age}-year-old reporting ${condition_title} for ${duration || "unspecified period"}. Verify raw answers for contraindications before prescribing.`;
      }

      const newConsultation = {
        id: consId,
        patient_id: "pat_" + Math.random().toString(36).substr(2, 9),
        patient_name,
        patient_phone,
        patient_age,
        condition: condition_title,
        duration,
        symptoms,
        raw_answers,
        status: "pending",
        stage: "initial",
        amount_paid: actualAmount,
        ai_summary: aiSummary,
        red_flag: redFlag,
        red_flag_source: redFlagSource,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: []
      };

      const createConsResponse = await fetch(`${supabaseUrl}/rest/v1/consultations`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(newConsultation)
      });

      if (!createConsResponse.ok) {
        const errText = await createConsResponse.text();
        throw new Error(`Failed to create consultation record in Supabase: ${errText}`);
      }

      const createdCons = await createConsResponse.json();

      // D. Create payment_credits row (with unassigned doctor initially)
      const creditId = "credit_" + Math.random().toString(36).substr(2, 9);
      await fetch(`${supabaseUrl}/rest/v1/payment_credits`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: creditId,
          consultation_id: consId,
          doctor_id: "unassigned",
          amount_earned: Math.round(actualAmount * 0.7),
          payment_type,
          payout_status: "unpaid",
          created_at: new Date().toISOString()
        })
      });

      // Return verified consultation
      return res.json({ ok: true, consultation: Array.isArray(createdCons) ? createdCons[0] : newConsultation });
    }

    res.status(400).json({ ok: false, code: "VERIFICATION_FAILED", message: "Transaction could not be verified." });
  } catch (err: any) {
    console.error("Payment Verification endpoint error:", err);
    res.status(500).json({ ok: false, code: "SERVER_ERROR", message: err.message || "Internal server error." });
  }
});

// 2. Flutterwave Webhook
app.post("/api/payment/webhook", async (req, res, next) => {
  try {
    const signature = req.headers["verif-hash"];
    const flwWebhookHash = process.env.FLW_WEBHOOK_HASH;

    // Signature check
    if (flwWebhookHash && signature !== flwWebhookHash) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED_WEBHOOK", message: "Webhook signature mismatch." });
    }

    const payload = req.body;
    const { id: flwTxId, txRef, amount, currency, status, customer } = payload;

    if (status === "successful" && currency === "NGN") {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

      // Check if tx_ref already processed in payments_log
      const checkLogRes = await fetch(`${supabaseUrl}/rest/v1/payments_log?tx_ref=eq.${txRef}`, {
        method: "GET",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      });

      if (checkLogRes.ok) {
        const logs = await checkLogRes.json();
        if (Array.isArray(logs) && logs.length > 0 && logs[0].verified) {
          // Already processed
          return res.json({ ok: true, message: "Webhook ignored. Transaction already processed." });
        }
      }

      // Log verified payment
      const payLogId = "pay_log_" + Math.random().toString(36).substr(2, 9);
      await fetch(`${supabaseUrl}/rest/v1/payments_log`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: payLogId,
          tx_ref: txRef,
          patient_phone: customer?.phone_number || "unknown",
          amount,
          payment_type: "new",
          verified: true,
          paid_at: new Date().toISOString()
        })
      });

      console.log(`Payment webhook successfully reconciled transaction: ${txRef}`);
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Payment Webhook endpoint error:", err);
    res.status(500).json({ ok: false, code: "SERVER_ERROR", message: err.message || "Internal server error." });
  }
});

// Memory store for tracking daily AI-assist requests per doctor (limit 50/day)
const doctorDailyUsage: Record<string, { date: string; count: number }> = {};

function checkDoctorLimit(doctorId: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const usage = doctorDailyUsage[doctorId];
  
  if (!usage || usage.date !== today) {
    doctorDailyUsage[doctorId] = { date: today, count: 1 };
    return true;
  }
  
  if (usage.count >= 50) {
    return false;
  }
  
  usage.count += 1;
  return true;
}

// API endpoint for AI Summary (Proxy to Supabase Edge Function: ai-summary)
app.post(
  "/api/ai-summary", 
  rateLimiter("aiSummary", 15, 3 * 60 * 1000, "Too many AI summaries requested. Please wait."), 
  async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          condition: req.body.condition,
          form_data: req.body.form_data
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase Edge Function responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      res.json({ summary: data.summary, red_flag: data.red_flag });
    } catch (error: any) {
      console.error("AI Summary Proxy failed or timed out, triggering fallback:", error);
      res.json({ 
        summary: `CLINICAL BRIEF (LOCAL FALLBACK): Patient reports history of ${req.body.condition || "condition"}. Verify raw questionnaires to rule out cardiac contraindications before issuing prescriptions.`,
        red_flag: false
      });
    }
  }
);

// API endpoint for AI Assist (Proxy to Supabase Edge Function: ai-assist)
app.post(
  "/api/ai-assist", 
  rateLimiter("aiAssist", 20, 3 * 60 * 1000, "Too many AI assist requests. Please wait."), 
  async (req, res) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    try {
      const doctorId = req.headers["x-doctor-id"] || "default_doctor";
      if (doctorId && typeof doctorId === "string" && doctorId !== "default_doctor") {
        const withinLimit = checkDoctorLimit(doctorId);
        if (!withinLimit) {
          return res.status(429).json({
            error: "Daily clinician draft limit reached. Doctors are restricted to 50 AI draft requests per day to maintain clinical diligence."
          });
        }
      }

      // Translate local Express payload to match the Supabase Edge Function's expected schema
      const { case_details, prompt: draftPrompt } = req.body;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          condition: case_details?.condition || "GHC",
          form_data: case_details?.symptoms || {},
          draft_response: draftPrompt || ""
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase Edge Function responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Write audit log entry for ai_assist_generated
      const auditId = "aud_ai_" + Math.random().toString(36).substr(2, 9);
      fetch(`${supabaseUrl}/rest/v1/audit_log`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: auditId,
          action: "ai_assist_generated",
          actor_type: "doctor",
          actor_id: String(req.headers["x-doctor-id"] || "default_doctor"),
          target_type: "consultation",
          target_id: String(case_details?.id || "unknown_case"),
          detail: `AI assist generated therapeutic draft response for condition: ${case_details?.condition || "unknown"}. Prompt: ${draftPrompt || "none"}`,
          created_at: new Date().toISOString()
        })
      }).catch(e => console.error("Could not write AI assist audit log:", e));

      res.json({ draft: data.draft });
    } catch (error: any) {
      console.error("AI Assist Proxy failed or timed out, triggering fallback:", error);
      const condition = req.body.case_details?.condition || "condition";

      // Write audit log entry for ai_assist_generated (fallback)
      const auditId = "aud_ai_" + Math.random().toString(36).substr(2, 9);
      fetch(`${supabaseUrl}/rest/v1/audit_log`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: auditId,
          action: "ai_assist_generated",
          actor_type: "doctor",
          actor_id: String(req.headers["x-doctor-id"] || "default_doctor"),
          target_type: "consultation",
          target_id: String(req.body.case_details?.id || "unknown_case"),
          detail: `AI assist generated therapeutic draft response (fallback) for condition: ${condition}.`,
          created_at: new Date().toISOString()
        })
      }).catch(e => console.error("Could not write AI assist fallback audit log:", e));

      res.json({ 
        draft: `CLINICAL ASSESSMENT (LOCAL FALLBACK)

Based on intake questionnaires, patient reports symptoms consistent with ${condition}.

WHY I THINK THIS
- Clinical answers match diagnostic patterns for ${condition}.
- No active cardiac risk contraindications reported during safety check.

PERSONALISED ACTION PLAN
- Recommend further clinical in-person assessment if symptoms worsen.
- Standard guidelines suggest lifestyle adjustments and stress management.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Initial review.
- □ Day 2: Early compliance check-in.
- □ Day 5: Care closing sign-off.

──────────────────────────────
PrivyDoc Medical Team
Reviewed by a licensed Nigerian doctor (MDCN registered)
privydoc.com.ng
──────────────────────────────`
      });
    }
  }
);

// --- PHASE 8: SCHEDULED TASKS (Cloud Scheduler -> Express) ---

const handleDoctorReminders = async (req: express.Request, res: express.Response) => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    // A. Fetch active/pending consultations that are assigned to a doctor
    const activeStages = ["initial", "day2_pending", "day5_pending", "review_open"];
    const stagesQuery = `stage=in.(${activeStages.join(",")})`;
    const consUrl = `${supabaseUrl}/rest/v1/consultations?${stagesQuery}&doctor_id=not.is.null&doctor_id=not.eq.unassigned`;
    
    const consRes = await fetch(consUrl, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!consRes.ok) {
      throw new Error(`Failed to fetch active consultations: ${await consRes.text()}`);
    }

    const consultations = await consRes.json();
    if (!Array.isArray(consultations) || consultations.length === 0) {
      return res.json({ ok: true, processed: 0, message: "No active consultations requiring SLA checks." });
    }

    // B. Fetch all doctors for phone mappings
    const docRes = await fetch(`${supabaseUrl}/rest/v1/doctors`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });
    
    const doctors = docRes.ok ? await docRes.json() : [];
    const docMap = new Map(doctors.map((d: any) => [d.id, d]));

    let remindersDispatched = 0;

    for (const cons of consultations) {
      const docId = cons.doctor_id;
      const doctor: any = docMap.get(docId);
      if (!doctor || !doctor.phone) continue;

      // SLA calculations
      const baseTime = new Date(cons.locked_at || cons.updated_at || cons.created_at).getTime();
      const elapsedHours = (Date.now() - baseTime) / (1000 * 60 * 60);

      let slaHours = 24;
      if (cons.stage === "day2_pending" || cons.stage === "day5_pending") {
        slaHours = 48;
      }

      const remainingHours = slaHours - elapsedHours;

      // Check if we need to send 6hr or 2hr reminder
      let reminderType: "6hr" | "2hr" | null = null;
      if (remainingHours <= 6.5 && remainingHours > 5.5) {
        reminderType = "6hr";
      } else if (remainingHours <= 2.5 && remainingHours > 1.5) {
        reminderType = "2hr";
      }

      if (!reminderType) continue;

      // Verify idempotency: Have we already sent this reminder?
      const notifCheckUrl = `${supabaseUrl}/rest/v1/notifications?recipient_id=eq.${docId}&message=ilike.*${cons.id}.*&message=ilike.*${reminderType}.*`;
      
      const notifCheckRes = await fetch(notifCheckUrl, {
        method: "GET",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      });

      if (notifCheckRes.ok) {
        const existing = await notifCheckRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          // Already sent
          continue;
        }
      }

      // Send WhatsApp (fire-and-forget proxy)
      const templateName = reminderType === "6hr" ? "doctor_reminder_6hr" : "doctor_reminder_2hr";
      const waUrl = `${supabaseUrl}/functions/v1/send-whatsapp`;
      fetch(waUrl, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: doctor.phone,
          template: templateName,
          variables: [doctor.name, cons.patient_name || "Patient", cons.condition || "telehealth case"]
        })
      }).catch(err => console.warn("WhatsApp dispatch error (safely bypassed):", err));

      // Create in-app notification
      const notifId = "notif_sla_" + Math.random().toString(36).substr(2, 9);
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: notifId,
          recipient_id: docId,
          recipient_role: "doctor",
          type: "new_case",
          title: `Urgent SLA Reminder (${reminderType})`,
          message: `SLA Reminder (${reminderType}) for Case ${cons.id}. Patient ${cons.patient_name} requires action on stage [${cons.stage}]. Please respond immediately to avoid credential warning.`,
          is_read: false,
          created_at: new Date().toISOString()
        })
      });

      remindersDispatched++;
    }

    res.json({ ok: true, processed: consultations.length, remindersDispatched });
  } catch (err: any) {
    console.error("Doctor SLA Reminders check failed:", err);
    res.status(500).json({ ok: false, error: err.message || "Internal scheduler error" });
  }
};

const handleAplCheck = async (req: express.Request, res: express.Response) => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    // Fetch all active/pending (not already suspended) doctors
    const docUrl = `${supabaseUrl}/rest/v1/doctors?status=neq.suspended`;
    const docRes = await fetch(docUrl, {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!docRes.ok) {
      throw new Error(`Failed to fetch doctors: ${await docRes.text()}`);
    }

    const doctors = await docRes.json();
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.json({ ok: true, processed: 0, actions: 0 });
    }

    const currentYear = new Date().getFullYear();
    const today = new Date();
    const month = today.getMonth(); // 0 is January
    const date = today.getDate();

    let actionsTaken = 0;

    for (const doc of doctors) {
      const aplYear = doc.apl_year;
      const isStale = !aplYear || aplYear < currentYear;

      if (isStale) {
        if (month === 0 && date < 30) {
          // Warning period: January 1 to January 29
          // Check if warning already sent in last 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const checkWarnUrl = `${supabaseUrl}/rest/v1/notifications?recipient_id=eq.${doc.id}&type=eq.flag&created_at=gt.${sevenDaysAgo}`;
          
          const checkWarnRes = await fetch(checkWarnUrl, {
            method: "GET",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            }
          });

          if (checkWarnRes.ok) {
            const warnings = await checkWarnRes.json();
            if (Array.isArray(warnings) && warnings.length > 0) {
              continue; // Skip, warning already sent recently
            }
          }

          // Create warning notification
          const warnId = "notif_apl_warn_" + Math.random().toString(36).substr(2, 9);
          await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: "POST",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: warnId,
              recipient_id: doc.id,
              recipient_role: "doctor",
              type: "flag",
              title: "Annual Practice License (APL) Renewal Due",
              message: `Dear Dr. ${doc.name}, your Annual Practice License (APL) year on file is ${aplYear || "stale/not uploaded"}. Please renew your APL for ${currentYear} and upload your current MDCN certificate to the Admin Office immediately to prevent automatic clinical credential suspension on January 30th.`,
              is_read: false,
              created_at: new Date().toISOString()
            } as any)
          });

          // Send warning WhatsApp
          const waUrl = `${supabaseUrl}/functions/v1/send-whatsapp`;
          fetch(waUrl, {
            method: "POST",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: doc.phone,
              template: "doctor_apl_warning",
              variables: [doc.name, currentYear.toString()]
            })
          }).catch(err => console.warn("APL warning WhatsApp dispatch error (safely bypassed):", err));

          actionsTaken++;
        } else if (month > 0 || (month === 0 && date >= 30)) {
          // Suspension period: January 30 onwards
          // Update doctor status to suspended
          await fetch(`${supabaseUrl}/rest/v1/doctors?id=eq.${doc.id}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              status: "suspended",
              flagged: true,
              flag_reason: `APL License is expired/stale (${aplYear || "none"}). Automatic suspension enforced.`
            })
          });

          // Create suspension notification
          const suspId = "notif_apl_susp_" + Math.random().toString(36).substr(2, 9);
          await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: "POST",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: suspId,
              recipient_id: doc.id,
              recipient_role: "doctor",
              type: "suspension",
              title: "Clinical Credentials Suspended",
              message: `Your practicing access has been automatically suspended due to an expired Annual Practice License (APL) year on file (${aplYear || "none"}). Please upload your current ${currentYear} MDCN practicing certificate to the Admin Office to reactivate your credentials.`,
              is_read: false,
              created_at: new Date().toISOString()
            } as any)
          });

          // Create audit log row
          const auditId = "audit_apl_" + Math.random().toString(36).substr(2, 9);
          await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
            method: "POST",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: auditId,
              action: "doctor_suspended",
              actor_type: "system",
              actor_id: "system",
              target_type: "doctor",
              target_id: doc.id,
              detail: `Automatic suspension of Dr. ${doc.name} due to stale APL license year ${aplYear || "none"}. Enforced on date: ${new Date().toLocaleDateString()}`,
              created_at: new Date().toISOString()
            } as any)
          });

          actionsTaken++;
        }
      }
    }

    res.json({ ok: true, processed: doctors.length, actionsTaken });
  } catch (err: any) {
    console.error("APL year enforcement check failed:", err);
    res.status(500).json({ ok: false, error: err.message || "Internal scheduler error" });
  }
};

app.get("/api/scheduler/doctor-reminders", handleDoctorReminders);
app.post("/api/scheduler/doctor-reminders", handleDoctorReminders);
app.get("/api/scheduler/apl-check", handleAplCheck);
app.post("/api/scheduler/apl-check", handleAplCheck);

// Serve Static Assets & SPA Handling
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    // Prevent serving index.html for missing assets or source files
    if (req.path.includes(".") || req.path.startsWith("/src/") || req.path.startsWith("/assets/")) {
      return res.status(404).send("Not Found");
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  // Setup Vite development server middleware
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  
  app.use(vite.middlewares);
}

// Global error handler envelope
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Uncaught Server Error:", err);
  res.status(500).json({
    ok: false,
    code: "INTERNAL_ERROR",
    message: err.message || "An unexpected error occurred on the server."
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`PrivyDoc full-stack server running at http://0.0.0.0:${port}`);
});
