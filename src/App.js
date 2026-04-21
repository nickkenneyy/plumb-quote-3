import { useState, useEffect, useMemo } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, setDoc
} from "firebase/firestore";
import { jsPDF } from "jspdf";

// ── Google Font import (add to your index.html <head>)
// <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">

const C = {
  navy:   "#0d1f3c",
  blue:   "#1a4b8c",
  sky:    "#2e7dd1",
  accent: "#f5a623",
  light:  "#f0f5fc",
  white:  "#ffffff",
  text:   "#2a3a52",
  muted:  "#637592",
  border: "#d4e1f5",
  danger: "#e53e3e",
  green:  "#22c55e",
  amber:  "#f59e0b",
};

const JOB_TYPES = ["Drain Cleaning", "Fixture Install", "Pipe Repair", "Rough In", "Water Heater", "Service Call"];

const PIPE_SIZES = ["1/4\"", "1/2\"", "3/4\"", "1\"", "1.5\"", "2\"", "3\"", "4\"", "6\""];

const PIPE_PRICING = {
  PVC: {
    "1/4\"": 0.68,  "1/2\"": 1.15,  "3/4\"": 1.42,
    "1\"":   1.95,  "1.5\"": 2.75,  "2\"":   3.65,
    "3\"":   5.50,  "4\"":   8.20,  "6\"":  14.50,
  },
  ABS: {
    "1/4\"": 0.78,  "1/2\"": 1.30,  "3/4\"": 1.62,
    "1\"":   2.20,  "1.5\"": 3.05,  "2\"":   4.10,
    "3\"":   6.30,  "4\"":   9.25,  "6\"":  16.00,
  },
  Copper: {
    "1/4\"": 2.60,  "1/2\"": 4.10,  "3/4\"": 6.20,
    "1\"":   9.00,  "1.5\"": 13.80, "2\"":  19.00,
    "3\"":  31.00,  "4\"":  47.00,  "6\"":  80.00,
  },
  PEX: {
    "1/4\"": 0.48,  "1/2\"": 0.95,  "3/4\"": 1.28,
    "1\"":   1.75,  "1.5\"": 2.55,  "2\"":   3.40,
    "3\"":   5.10,  "4\"":   7.65,  "6\"":  12.20,
  },
};

const FITTING_SIZES = ["1/2\"", "3/4\"", "1\"", "1.5\"", "2\"", "3\"", "4\""];

const FITTING_KEYS = [
  { key: "elbow_90", label: "90° Elbow" },
  { key: "elbow_45", label: "45° Elbow" },
  { key: "tee",      label: "Tee"       },
  { key: "coupling", label: "Coupling"  },
  { key: "reducer",  label: "Reducer"   },
  { key: "cap",      label: "Cap"       },
];

const FITTING_PRICING = {
  PVC: {
    elbow_90: { "1/2\"": 1.05, "3/4\"": 1.40, "1\"": 2.10, "1.5\"": 3.40, "2\"": 4.85, "3\"": 8.20,  "4\"": 12.50 },
    elbow_45: { "1/2\"": 0.95, "3/4\"": 1.25, "1\"": 1.90, "1.5\"": 3.10, "2\"": 4.30, "3\"": 7.50,  "4\"": 11.50 },
    tee:      { "1/2\"": 1.35, "3/4\"": 1.75, "1\"": 2.70, "1.5\"": 4.10, "2\"": 5.95, "3\"": 10.20, "4\"": 15.50 },
    coupling: { "1/2\"": 0.72, "3/4\"": 0.92, "1\"": 1.45, "1.5\"": 2.30, "2\"": 3.45, "3\"": 5.80,  "4\"": 9.10  },
    reducer:  { "1/2\"": 1.15, "3/4\"": 1.50, "1\"": 2.30, "1.5\"": 3.65, "2\"": 5.30, "3\"": 8.90,  "4\"": 14.00 },
    cap:      { "1/2\"": 0.58, "3/4\"": 0.78, "1\"": 1.15, "1.5\"": 1.85, "2\"": 2.70, "3\"": 4.60,  "4\"": 7.20  },
  },
  ABS: {
    elbow_90: { "1/2\"": 1.25, "3/4\"": 1.65, "1\"": 2.55, "1.5\"": 3.90, "2\"": 5.65, "3\"": 9.50,  "4\"": 14.50 },
    elbow_45: { "1/2\"": 1.10, "3/4\"": 1.48, "1\"": 2.25, "1.5\"": 3.50, "2\"": 5.05, "3\"": 8.60,  "4\"": 13.10 },
    tee:      { "1/2\"": 1.55, "3/4\"": 2.05, "1\"": 3.10, "1.5\"": 4.85, "2\"": 7.00, "3\"": 11.70, "4\"": 18.00 },
    coupling: { "1/2\"": 0.88, "3/4\"": 1.12, "1\"": 1.70, "1.5\"": 2.70, "2\"": 3.95, "3\"": 6.80,  "4\"": 10.60 },
    reducer:  { "1/2\"": 1.35, "3/4\"": 1.75, "1\"": 2.65, "1.5\"": 4.15, "2\"": 6.00, "3\"": 10.20, "4\"": 16.00 },
    cap:      { "1/2\"": 0.68, "3/4\"": 0.92, "1\"": 1.35, "1.5\"": 2.15, "2\"": 3.10, "3\"": 5.30,  "4\"": 8.20  },
  },
  Copper: {
    elbow_90: { "1/2\"": 4.80, "3/4\"": 7.20, "1\"": 11.50, "1.5\"": 17.50, "2\"": 26.00, "3\"": 46.00, "4\"": 74.00 },
    elbow_45: { "1/2\"": 4.25, "3/4\"": 6.50, "1\"": 10.20, "1.5\"": 15.80, "2\"": 23.50, "3\"": 41.00, "4\"": 67.00 },
    tee:      { "1/2\"": 5.80, "3/4\"": 8.80, "1\"": 13.50, "1.5\"": 20.50, "2\"": 30.50, "3\"": 54.00, "4\"": 87.00 },
    coupling: { "1/2\"": 3.00, "3/4\"": 4.50, "1\"": 7.00,  "1.5\"": 10.80, "2\"": 16.20, "3\"": 28.50, "4\"": 46.00 },
    reducer:  { "1/2\"": 3.75, "3/4\"": 5.60, "1\"": 8.60,  "1.5\"": 13.50, "2\"": 20.00, "3\"": 35.00, "4\"": 57.00 },
    cap:      { "1/2\"": 2.35, "3/4\"": 3.55, "1\"": 5.40,  "1.5\"": 8.40,  "2\"": 12.50, "3\"": 22.00, "4\"": 35.00 },
  },
  PEX: {
    elbow_90: { "1/2\"": 2.45, "3/4\"": 3.60, "1\"": 5.50,  "1.5\"": 8.60,  "2\"": 12.80, "3\"": 22.50, "4\"": 36.00 },
    elbow_45: { "1/2\"": 2.20, "3/4\"": 3.20, "1\"": 4.90,  "1.5\"": 7.70,  "2\"": 11.50, "3\"": 20.00, "4\"": 32.00 },
    tee:      { "1/2\"": 3.10, "3/4\"": 4.50, "1\"": 6.80,  "1.5\"": 10.50, "2\"": 15.50, "3\"": 27.00, "4\"": 43.00 },
    coupling: { "1/2\"": 1.55, "3/4\"": 2.25, "1\"": 3.50,  "1.5\"": 5.50,  "2\"": 8.20,  "3\"": 14.50, "4\"": 23.00 },
    reducer:  { "1/2\"": 2.00, "3/4\"": 2.90, "1\"": 4.40,  "1.5\"": 6.80,  "2\"": 10.20, "3\"": 17.80, "4\"": 28.50 },
    cap:      { "1/2\"": 1.20, "3/4\"": 1.75, "1\"": 2.70,  "1.5\"": 4.25,  "2\"": 6.30,  "3\"": 11.00, "4\"": 17.50 },
  },
};

// NEW FEATURE — Ontario pre-built job templates
const ONTARIO_TEMPLATES = [
  {
    id: "tpl_water_heater",
    name: "Water Heater Replacement",
    jobType: "Water Heater",
    hours: 3,
    hourlyRate: 120,
    materialCost: 680,
    markup: 1.35,
    materialsList: "40-gal power vent water heater, dielectric unions, T&P valve, supply lines, misc fittings",
    siteNotes: "",
    fixtures: [{ name: "", labour: 0, qty: 1 }],
    pipes: [],
    fittings: [],
    roughLabour: 0,
    subContractorCost: 0,
  },
  {
    id: "tpl_toilet_install",
    name: "Toilet Install",
    jobType: "Fixture Install",
    hours: 1.5,
    hourlyRate: 120,
    materialCost: 45,
    markup: 1.4,
    materialsList: "Wax ring, closet bolts, supply line, toilet seat bolts",
    siteNotes: "",
    fixtures: [{ name: "Toilet", labour: 180, qty: 1 }],
    pipes: [],
    fittings: [],
    roughLabour: 0,
    subContractorCost: 0,
  },
  {
    id: "tpl_drain_cleaning",
    name: "Drain Cleaning (Snake)",
    jobType: "Drain Cleaning",
    hours: 1.5,
    hourlyRate: 120,
    materialCost: 15,
    markup: 1.4,
    materialsList: "Drain cleaner, rags",
    siteNotes: "",
    fixtures: [{ name: "", labour: 0, qty: 1 }],
    pipes: [],
    fittings: [],
    roughLabour: 0,
    subContractorCost: 0,
  },
  {
    id: "tpl_shutoff_valve",
    name: "Main Shutoff Valve Replacement",
    jobType: "Pipe Repair",
    hours: 2,
    hourlyRate: 120,
    materialCost: 85,
    markup: 1.4,
    materialsList: "1\" ball valve, 2x copper couplings, solder, flux, emery cloth",
    siteNotes: "Confirm location of curb stop before scheduling. May require city shutoff.",
    fixtures: [{ name: "", labour: 0, qty: 1 }],
    pipes: [],
    fittings: [],
    roughLabour: 0,
    subContractorCost: 0,
  },
  {
    id: "tpl_service_call",
    name: "Service Call (Diagnostic)",
    jobType: "Service Call",
    hours: 1,
    hourlyRate: 120,
    materialCost: 0,
    markup: 1.4,
    materialsList: "",
    siteNotes: "",
    fixtures: [{ name: "", labour: 0, qty: 1 }],
    pipes: [],
    fittings: [],
    roughLabour: 0,
    subContractorCost: 0,
  },
];

const LOW_MARGIN_THRESHOLD = 20; // warn if profit margin below this %

const newPipeRow = () => ({
  type: "PVC", size: "1/2\"",
  pricePerFt: PIPE_PRICING.PVC["1/2\""],
  costPerFt: PIPE_PRICING.PVC["1/2\""], // NEW — track cost separately
  length: 0,
});

const buildDefaultPipes = () => [
  { type: "PVC",    size: "1/2\"", pricePerFt: PIPE_PRICING.PVC["1/2\""],    costPerFt: PIPE_PRICING.PVC["1/2\""],    length: 0 },
  { type: "ABS",    size: "1/2\"", pricePerFt: PIPE_PRICING.ABS["1/2\""],    costPerFt: PIPE_PRICING.ABS["1/2\""],    length: 0 },
  { type: "Copper", size: "1/2\"", pricePerFt: PIPE_PRICING.Copper["1/2\""], costPerFt: PIPE_PRICING.Copper["1/2\""], length: 0 },
  { type: "PEX",    size: "1/2\"", pricePerFt: PIPE_PRICING.PEX["1/2\""],    costPerFt: PIPE_PRICING.PEX["1/2\""],    length: 0 },
];

const buildDefaultFittings = () =>
  FITTING_KEYS.map(({ key, label }) => ({
    key, label,
    material:  "PVC",
    size:      "1/2\"",
    unitPrice: FITTING_PRICING.PVC[key]["1/2\""],
    unitCost:  FITTING_PRICING.PVC[key]["1/2\""], // NEW — track cost separately
    qty:       0,
  }));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n) => "$" + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

// NEW FEATURE — generate sequential document numbers
const generateDocNumber = async (uid, type) => {
  const counterRef = doc(db, "counters", `${uid}_${type}`);
  const snap = await getDoc(counterRef);
  const current = snap.exists() ? (snap.data().count || 0) : 0;
  const next = current + 1;
  await setDoc(counterRef, { count: next });
  const year = new Date().getFullYear();
  const padded = String(next).padStart(4, "0");
  return type === "quote" ? `Q-${year}-${padded}` : `INV-${year}-${padded}`;
};

// NEW FEATURE — check if invoice is overdue
const isOverdue = (inv) => {
  if (inv.status === "Paid") return false;
  if (!inv.dueDate) return false;
  return new Date(inv.dueDate) < new Date();
};

const STATUS_QUOTE   = ["Draft", "Sent", "Approved", "Rejected", "Expired"];
const STATUS_INVOICE = ["Draft", "Sent", "Paid", "Overdue"];

const STATUS_STYLE = {
  Draft:    { background: "#f0f5fc", color: "#637592",  border: "1px solid #d4e1f5" },
  Sent:     { background: "#eff6ff", color: "#2e7dd1",  border: "1px solid #bfdbfe" },
  Approved: { background: "#f0fdf4", color: "#16a34a",  border: "1px solid #bbf7d0" },
  Rejected: { background: "#fef2f2", color: "#dc2626",  border: "1px solid #fecaca" },
  Expired:  { background: "#fdf4ff", color: "#9333ea",  border: "1px solid #e9d5ff" },
  Paid:     { background: "#f0fdf4", color: "#16a34a",  border: "1px solid #bbf7d0" },
  Overdue:  { background: "#fff7ed", color: "#c2410c",  border: "1px solid #fed7aa" },
  Invoice:  { background: "#fefce8", color: "#ca8a04",  border: "1px solid #fde68a" },
};

// NEW FEATURE — default company settings shape
const DEFAULT_SETTINGS = {
  companyName: "My Plumbing Co.",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  hstNumber: "",
  defaultMarkup: 1.4,
  defaultHourlyRate: 120,
  quoteExpiryDays: 30,
  defaultNetDays: 30,
  defaultMarginWarning: 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFIT FIX // NEW CALCULATION ENGINE
// Central function — used everywhere: QuoteEditor, Dashboard, CSV exports.
//
// RULES (enforced here, nowhere else):
//   material_cost   = what YOU paid for materials (cost price, no markup)
//   material_revenue = what the CUSTOMER pays for materials (cost × markup)
//   labour_revenue  = what the CUSTOMER pays for labour (hours × rate, or fixture totals)
//   total_price     = material_revenue + labour_revenue   (pre-HST subtotal)
//   profit          = total_price − material_cost         (labour is NEVER subtracted)
//   profit_margin   = (profit / total_price) × 100
//   hst             = total_price × 0.13
//   total_with_tax  = total_price + hst
//
// subContractorCost is an INTERNAL overhead deducted from profit only.
// It never appears on the customer-facing quote or invoice.
// ─────────────────────────────────────────────────────────────────────────────

function calculateJobTotals(job) {
  const {
    jobType        = "Drain Cleaning",
    hours          = 0,
    hourlyRate     = 0,
    materialCost   = 0,   // raw cost (what you paid)
    markup         = 1.4,
    fixtures       = [],
    pipes          = [],
    fittings       = [],
    roughLabour    = 0,
    subContractorCost = 0,
  } = job;

  const HST = 0.13;

  let material_cost    = 0;  // what you paid
  let material_revenue = 0;  // what customer pays for materials
  let labour_revenue   = 0;  // what customer pays for labour

  if (jobType === "Rough In") {
    // Pipes: sell price vs cost price are tracked separately per row
    const pipesRevenue = pipes.reduce((s, p) => s + Number(p.length || 0) * Number(p.pricePerFt || 0), 0);
    const pipesCost    = pipes.reduce((s, p) => s + Number(p.length || 0) * Number(p.costPerFt  || p.pricePerFt || 0), 0);

    const fittingsRevenue = fittings.reduce((s, f) => s + Number(f.qty || 0) * Number(f.unitPrice || 0), 0);
    const fittingsCost    = fittings.reduce((s, f) => s + Number(f.qty || 0) * Number(f.unitCost  || f.unitPrice || 0), 0);

    material_cost    = pipesCost + fittingsCost;
    material_revenue = pipesRevenue + fittingsRevenue;
    labour_revenue   = Number(roughLabour);   // roughLabour = labour charge billed to customer

  } else if (jobType === "Fixture Install") {
    // Fixtures: labour is the charge per fixture × qty
    labour_revenue   = fixtures.reduce((s, f) => s + Number(f.labour || 0) * Number(f.qty || 0), 0);
    material_cost    = Number(materialCost);
    material_revenue = Number(materialCost) * Number(markup);

  } else {
    // Drain Cleaning, Pipe Repair, Water Heater, Service Call
    labour_revenue   = Number(hours) * Number(hourlyRate);
    material_cost    = Number(materialCost);
    material_revenue = Number(materialCost) * Number(markup);
  }

  const total_price    = material_revenue + labour_revenue;   // subtotal (pre-HST)
  const hst            = total_price * HST;
  const total_with_tax = total_price + hst;

  // Profit: revenue minus what it actually cost you.
  // Labour is REVENUE, not a cost. Sub costs are an internal overhead.
  const profit         = total_price - material_cost - Number(subContractorCost);
  const profit_margin  = total_price > 0 ? (profit / total_price) * 100 : 0;

  return {
    material_cost:    round2(material_cost),
    material_revenue: round2(material_revenue),
    labour_revenue:   round2(labour_revenue),
    total_price:      round2(total_price),      // subtotal
    hst:              round2(hst),
    total_with_tax:   round2(total_with_tax),   // total incl HST
    profit:           round2(profit),
    profit_margin:    parseFloat(profit_margin.toFixed(1)),
    // legacy field aliases so existing Firestore reads keep working
    subtotal:         round2(total_price),
    total:            round2(total_with_tax),
  };
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]       = useState(null);
  const [view, setView]       = useState("dashboard");
  const [editingQuote, setEditingQuote]     = useState(null);
  const [customers, setCustomers]           = useState([]);
  const [quotes, setQuotes]                 = useState([]);
  const [invoices, setInvoices]             = useState([]);
  const [settings, setSettings]             = useState(DEFAULT_SETTINGS);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showMore, setShowMore]             = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unsubC = onSnapshot(
      query(collection(db, "customers"), where("uid", "==", uid), orderBy("createdAt", "desc")),
      (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubQ = onSnapshot(
      query(collection(db, "quotes"), where("uid", "==", uid), orderBy("createdAt", "desc")),
      (snap) => setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubI = onSnapshot(
      query(collection(db, "invoices"), where("uid", "==", uid), orderBy("createdAt", "desc")),
      (snap) => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // NEW — load company settings
    const unsubS = onSnapshot(doc(db, "settings", uid), (snap) => {
      if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
    });

    // NEW — load user-saved templates
    const unsubT = onSnapshot(
      query(collection(db, "templates"), where("uid", "==", uid), orderBy("createdAt", "desc")),
      (snap) => setSavedTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubC(); unsubQ(); unsubI(); unsubS(); unsubT(); };
  }, [user]);

  const handleLogin  = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  // NEW — check for expired quotes automatically
  useEffect(() => {
    if (!quotes.length) return;
    quotes.forEach(async (q) => {
      if (q.status === "Sent" && q.expiryDate) {
        if (new Date(q.expiryDate) < new Date()) {
          await updateDoc(doc(db, "quotes", q.id), { status: "Expired" });
        }
      }
    });
  }, [quotes]);

  const openNewQuote = (prefilledCustomer = null, template = null) => {
    setEditingQuote({ _new: true, customer: prefilledCustomer, _template: template });
    setView("quote");
  };

  const openQuote = (q) => {
    setEditingQuote(q);
    setView("quote");
  };

  // NEW — public approval view (if URL has ?quote=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qid = params.get("quote");
    if (qid) setView(`approve:${qid}`);
  }, []);

  if (!user && !view.startsWith("approve:")) return <LoginScreen onLogin={handleLogin} />;

  // NEW — public quote approval page
  if (view.startsWith("approve:")) {
    const qid = view.split(":")[1];
    return <PublicQuoteApproval quoteId={qid} />;
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // bottom tab nav — 5 primary items, "more" drawer for templates/settings
  const bottomTabs = [
    { id: "dashboard", label: "Home",     icon: "🏠" },
    { id: "quote",     label: "New",      icon: "✚"  },
    { id: "quotes",    label: "Quotes",   icon: "📄" },
    { id: "invoices",  label: "Invoices", icon: "🧾" },
    { id: "more",      label: "More",     icon: "☰"  },
  ];

  const desktopNavItems = [
    { id: "dashboard",  label: "Dashboard",  icon: "🏠" },
    { id: "quote",      label: "New Quote",  icon: "✚"  },
    { id: "quotes",     label: "Quotes",     icon: "📄" },
    { id: "invoices",   label: "Invoices",   icon: "🧾" },
    { id: "customers",  label: "Customers",  icon: "👤" },
    { id: "templates",  label: "Templates",  icon: "📋" },
    { id: "settings",   label: "Settings",   icon: "⚙️" },
  ];

  const overdueCount = invoices.filter(i => isOverdue(i) && i.status !== "Paid").length;

  const navigate = (id) => {
    if (id === "quote") setEditingQuote({ _new: true });
    setView(id);
    setShowMore(false);
  };

  const isActive = (id) => view === id || (id === "quote" && view === "quote");

  return (
    <div style={s.appWrap}>
      {/* ── DESKTOP HEADER (hidden on mobile via CSS class) */}
      <header style={s.header} className="desktop-header">
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 2 8 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" opacity=".3" fill="white"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <span style={s.headerTitle}>Plumb<span style={{ color: C.sky }}>Quote</span> 3</span>
        </div>
        <nav style={s.nav}>
          {desktopNavItems.map(n => (
            <button key={n.id} style={isActive(n.id) ? { ...s.navBtn, ...s.navBtnActive } : s.navBtn} onClick={() => navigate(n.id)}>
              <span style={{ marginRight: 5, fontSize: 14 }}>{n.icon}</span>{n.label}
              {n.id === "invoices" && overdueCount > 0 && (
                <span style={{ marginLeft: 6, background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700 }}>{overdueCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user.displayName?.[0] ?? "U"}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* ── MOBILE HEADER (shown only on mobile) */}
      <header style={s.mobileHeader} className="mobile-header">
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 2 8 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" opacity=".3" fill="white"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <span style={s.headerTitle}>Plumb<span style={{ color: C.sky }}>Quote</span> 3</span>
        </div>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user.displayName?.[0] ?? "U"}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* ── MORE DRAWER (mobile) */}
      {showMore && (
        <div style={s.moreDrawerOverlay} onClick={() => setShowMore(false)}>
          <div style={s.moreDrawer} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid " + C.border, fontWeight: 700, color: C.navy, fontSize: "0.9rem" }}>More</div>
            {[
              { id: "customers", label: "Customers", icon: "👤" },
              { id: "templates", label: "Templates", icon: "📋" },
              { id: "settings",  label: "Settings",  icon: "⚙️" },
            ].map(n => (
              <button key={n.id} style={s.moreDrawerItem} onClick={() => navigate(n.id)}>
                <span style={{ fontSize: 18, marginRight: 14 }}>{n.icon}</span>
                <span style={{ fontSize: "1rem", color: C.navy }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main style={s.main}>
        {view === "dashboard" && (
          <DashboardView quotes={quotes} invoices={invoices} customers={customers} onOpenQuote={openQuote} onNewQuote={openNewQuote} />
        )}
        {view === "quote" && (
          <QuoteEditor
            user={user} quoteData={editingQuote} customers={customers} quotes={quotes} settings={settings}
            onSaved={(q) => { setEditingQuote(q); setView("quotes"); }}
            onConvertToInvoice={async (q) => { await convertToInvoice(q, user.uid, settings); setView("invoices"); }}
          />
        )}
        {view === "quotes" && (
          <QuotesListView quotes={quotes} customers={customers} onOpenQuote={openQuote}
            onNewQuote={() => { setEditingQuote({ _new: true }); setView("quote"); }}
            onDuplicate={async (q) => { const dup = await duplicateQuote(q, user.uid); openQuote(dup); }}
          />
        )}
        {view === "invoices" && <InvoicesListView invoices={invoices} customers={customers} quotes={quotes} user={user} />}
        {view === "customers" && <CustomersView user={user} customers={customers} quotes={quotes} invoices={invoices} onNewQuote={openNewQuote} onOpenQuote={openQuote} />}
        {view === "templates" && <TemplatesView user={user} savedTemplates={savedTemplates} onUseTemplate={(tpl) => openNewQuote(null, tpl)} />}
        {view === "settings"  && <SettingsView user={user} settings={settings} />}
      </main>

      {/* ── MOBILE BOTTOM TAB BAR */}
      <nav style={s.bottomNav} className="mobile-bottom-nav">
        {bottomTabs.map(n => {
          const active = n.id === "more" ? showMore : isActive(n.id);
          return (
            <button
              key={n.id}
              style={{ ...s.bottomTab, ...(active ? s.bottomTabActive : {}) }}
              onClick={() => {
                if (n.id === "more") { setShowMore(v => !v); return; }
                navigate(n.id);
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, display: "block", marginBottom: 3 }}>{n.icon}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>
                {n.label}
                {n.id === "invoices" && overdueCount > 0 && (
                  <span style={{ marginLeft: 3, background: C.danger, color: "#fff", borderRadius: 8, padding: "0 5px", fontSize: "0.6rem", fontWeight: 700 }}>{overdueCount}</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── GLOBAL MOBILE-RESPONSIVE STYLES */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-header { display: none !important; }
          .mobile-header  { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
        @media (min-width: 641px) {
          .desktop-header { display: flex !important; }
          .mobile-header  { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, select, textarea { font-size: 16px !important; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 1; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function saveQuote(quoteData, uid, settings) {
  // NEW — auto-assign quote number if new
  let quoteNumber = quoteData.quoteNumber;
  if (!quoteNumber) {
    quoteNumber = await generateDocNumber(uid, "quote");
  }
  // NEW — auto-set expiry date if not set
  const expiryDays = settings?.quoteExpiryDays || 30;
  const expiryDate = quoteData.expiryDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + expiryDays);
    return d.toISOString().split("T")[0];
  })();

  const payload = { ...quoteData, uid, quoteNumber, expiryDate, updatedAt: serverTimestamp() };
  delete payload.id; delete payload._new; delete payload._template;
  if (quoteData.id) {
    await updateDoc(doc(db, "quotes", quoteData.id), payload);
    return { ...quoteData, ...payload };
  } else {
    payload.createdAt = serverTimestamp();
    const ref = await addDoc(collection(db, "quotes"), payload);
    return { ...payload, id: ref.id };
  }
}

async function duplicateQuote(q, uid) {
  const payload = {
    ...q,
    uid,
    status: "Draft",
    jobName: q.jobName + " (copy)",
    quoteNumber: await generateDocNumber(uid, "quote"), // NEW
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete payload.id;
  const ref = await addDoc(collection(db, "quotes"), payload);
  return { ...payload, id: ref.id };
}

async function convertToInvoice(q, uid, settings) {
  const netDays = settings?.defaultNetDays || 30;
  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + netDays);
    return d.toISOString().split("T")[0];
  })();
  const invoiceNumber = await generateDocNumber(uid, "invoice"); // NEW
  const payload = {
    ...q,
    uid,
    quoteId: q.id,
    status: "Draft",
    invoiceType: true,
    invoiceNumber, // NEW
    dueDate,       // NEW
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete payload.id; delete payload._new;
  const ref = await addDoc(collection(db, "invoices"), payload);
  return { ...payload, id: ref.id };
}

// NEW — save company settings
async function saveSettings(uid, settings) {
  await setDoc(doc(db, "settings", uid), { ...settings, updatedAt: serverTimestamp() });
}

// NEW — save a job as a reusable template
async function saveAsTemplate(uid, quoteData, templateName) {
  const payload = {
    ...quoteData,
    uid,
    name: templateName,
    createdAt: serverTimestamp(),
  };
  delete payload.id; delete payload._new;
  await addDoc(collection(db, "templates"), payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6 2 2 8 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" opacity=".3" fill="white"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <h1 style={s.loginTitle}>Plumb<span style={{ color: C.sky }}>Quote</span> 3</h1>
        <p style={s.loginSub}>Professional plumbing estimates in 30 seconds</p>
        <button style={s.googleBtn} onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 10, flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <p style={s.loginFooter}>Built for Ontario plumbers</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function DashboardView({ quotes, invoices, customers, onOpenQuote, onNewQuote }) {
  // PROFIT FIX — recalculate all paid invoices through the central engine
  // so the dashboard always shows correct numbers even for old records
  const paidInvoices = invoices.filter(i => i.status === "Paid");

  const totalRevenue = paidInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

  // Recalculate profit correctly for each paid invoice via central engine
  const totalProfit = paidInvoices.reduce((s, i) => {
    const c = calculateJobTotals(i);
    return s + c.profit;
  }, 0);

  const avgMargin = paidInvoices.length > 0
    ? paidInvoices.reduce((s, i) => {
        const c = calculateJobTotals(i);
        return s + c.profit_margin;
      }, 0) / paidInvoices.length
    : 0;

  const pendingQuotes  = quotes.filter(q => q.status === "Sent" || q.status === "Draft").length;
  const recentQuotes   = quotes.slice(0, 5);
  const overdueInvoices = invoices.filter(i => isOverdue(i) && i.status !== "Paid");
  const pendingRevenue  = invoices
    .filter(i => i.status === "Sent" || i.status === "Draft")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  const marginColor = avgMargin >= 40 ? C.green : avgMargin >= 25 ? C.accent : C.danger;

  const stats = [
    { label: "Revenue (Paid)",   value: fmtCurrency(totalRevenue),           color: C.green  },
    { label: "Total Profit",     value: fmtCurrency(totalProfit),             color: C.sky    },
    { label: "Avg Margin",       value: avgMargin.toFixed(1) + "%",           color: marginColor },
    { label: "Pending Revenue",  value: fmtCurrency(pendingRevenue),          color: C.accent },
    { label: "Pending Quotes",   value: pendingQuotes,                        color: C.muted  },
    { label: "Customers",        value: customers.length,                     color: C.blue   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Dashboard</h2>
        <button style={s.primaryBtn} onClick={() => onNewQuote()}>+ New Quote</button>
      </div>

      {/* NEW — overdue alert banner */}
      {overdueInvoices.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#c2410c", fontSize: "0.9rem" }}>
              {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#9a3412", marginTop: 2 }}>
              {fmtCurrency(overdueInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0))} outstanding — follow up now
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {stats.map(st => (
          <div key={st.label} style={s.statCard}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 8 }}>{st.label}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 700, color: st.color, fontFamily: "'DM Serif Display', serif" }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Quotes */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Recent Quotes</span>
        </div>
        <div style={s.sectionBody}>
          {recentQuotes.length === 0 && <EmptyState text="No quotes yet — create your first one!" />}
          {recentQuotes.map(q => (
            <QuoteRow key={q.id} q={q} onClick={() => onOpenQuote(q)} />
          ))}
        </div>
      </div>

      {/* NEW — overdue invoices section */}
      {overdueInvoices.length > 0 && (
        <div style={s.section}>
          <div style={{ ...s.sectionHeader, background: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
            <span style={{ ...s.sectionTitle, color: "#c2410c" }}>⚠️ Overdue Invoices</span>
          </div>
          <div style={s.sectionBody}>
            {overdueInvoices.map(inv => (
              <div key={inv.id} style={{ ...s.listRow, border: "1px solid #fed7aa" }}>
                <div style={{ flex: 1 }}>
                  <div style={s.listRowTitle}>{inv.jobName || "Invoice"}</div>
                  <div style={{ ...s.listRowMeta, color: "#c2410c" }}>
                    {inv.invoiceNumber && `${inv.invoiceNumber} · `}Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-CA") : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: C.danger }}>{fmtCurrency(inv.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

function QuotesListView({ quotes, customers, onOpenQuote, onNewQuote, onDuplicate }) {
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState("All");
  const [exportRange, setExportRange] = useState({ from: "", to: "" });

  const custName = (id) => customers.find(c => c.id === id)?.name || "—";

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const name = (q.jobName || "") + (custName(q.customerId) || "") + (q.clientName || "");
      const matchSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || q.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, filterStatus, customers]);

  const exportCSV = () => {
    let rows = quotes;
    if (exportRange.from) rows = rows.filter(q => {
      const d = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt || 0);
      return d >= new Date(exportRange.from);
    });
    if (exportRange.to) rows = rows.filter(q => {
      const d = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt || 0);
      return d <= new Date(exportRange.to + "T23:59:59");
    });
    const headers = ["Quote #","Date","Customer","Job Name","Job Type","Material Cost","Labour Revenue","Subtotal","HST","Total","Profit","Margin %","Status","Expiry"];
    const csvRows = rows.map(q => {
      const c = calculateJobTotals(q);
      return [
        q.quoteNumber || "",
        fmtDate(q.createdAt),
        custName(q.customerId) || q.clientName || "",
        q.jobName || "",
        q.jobType || "",
        c.material_cost.toFixed(2),
        c.labour_revenue.toFixed(2),
        c.total_price.toFixed(2),
        c.hst.toFixed(2),
        c.total_with_tax.toFixed(2),
        c.profit.toFixed(2),
        c.profit_margin.toFixed(1) + "%",
        q.status || "Draft",
        q.expiryDate || "",
      ];
    });
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "plumbquote-quotes.csv"; a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Quotes</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.secondaryBtn} onClick={exportCSV}>⬇ Export CSV</button>
          <button style={s.primaryBtn} onClick={onNewQuote}>+ New Quote</button>
        </div>
      </div>

      <div style={{ ...s.section, padding: 0 }}>
        <div style={s.sectionHeader}><span style={s.sectionTitle}>Export for Accountant</span></div>
        <div style={{ ...s.sectionBody, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          <div style={s.field}>
            <label style={s.label}>From Date</label>
            <input type="date" style={s.input} value={exportRange.from} onChange={e => setExportRange(r => ({ ...r, from: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>To Date</label>
            <input type="date" style={s.input} value={exportRange.to} onChange={e => setExportRange(r => ({ ...r, to: e.target.value }))} />
          </div>
          <button style={s.primaryBtn} onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...s.input, maxWidth: 280 }}
          placeholder="🔍  Search by customer or job..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {["All", ...STATUS_QUOTE].map(st => (
          <button
            key={st}
            style={filterStatus === st ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
            onClick={() => setFilter(st)}
          >{st}</button>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionBody}>
          {filtered.length === 0 && <EmptyState text="No quotes match your search." />}
          {filtered.map(q => (
            <QuoteRow
              key={q.id}
              q={q}
              custName={custName(q.customerId) || q.clientName}
              onClick={() => onOpenQuote(q)}
              onDuplicate={() => onDuplicate(q)}
              showDuplicate
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

function InvoicesListView({ invoices, customers, quotes, user }) {
  const [search, setSearch]   = useState("");
  const [filterStatus, setFilter] = useState("All");
  const [exportRange, setExportRange] = useState({ from: "", to: "" });

  const custName = (inv) => {
    if (inv.customerId) return customers.find(c => c.id === inv.customerId)?.name || "—";
    return inv.clientName || "—";
  };

  // NEW — compute effective status (overdue check)
  const effectiveStatus = (inv) => {
    if (inv.status === "Paid") return "Paid";
    if (isOverdue(inv)) return "Overdue";
    return inv.status || "Draft";
  };

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const name = (inv.jobName || "") + custName(inv);
      const matchSearch = name.toLowerCase().includes(search.toLowerCase());
      const effStatus = effectiveStatus(inv);
      const matchStatus = filterStatus === "All" || effStatus === filterStatus || inv.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, filterStatus, customers]);

  const markPaid = async (inv) => {
    await updateDoc(doc(db, "invoices", inv.id), {
      status: "Paid",
      paidAt: serverTimestamp(),
    });
  };

  const exportCSV = () => {
    let rows = invoices;
    if (exportRange.from) rows = rows.filter(inv => {
      const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
      return d >= new Date(exportRange.from);
    });
    if (exportRange.to) rows = rows.filter(inv => {
      const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
      return d <= new Date(exportRange.to + "T23:59:59");
    });
    const headers = ["Invoice #","Date","Due Date","Paid Date","Customer","Job Name","Material Cost","Labour Revenue","Subtotal","HST","Total","Profit","Margin %","Status"];
    const csvRows = rows.map(inv => {
      const c = calculateJobTotals(inv);
      return [
        inv.invoiceNumber || "",
        fmtDate(inv.createdAt),
        inv.dueDate || "",
        fmtDate(inv.paidAt),
        custName(inv),
        inv.jobName || "",
        c.material_cost.toFixed(2),
        c.labour_revenue.toFixed(2),
        c.total_price.toFixed(2),
        c.hst.toFixed(2),
        c.total_with_tax.toFixed(2),
        c.profit.toFixed(2),
        c.profit_margin.toFixed(1) + "%",
        effectiveStatus(inv),
      ];
    });
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "plumbquote-invoices.csv"; a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Invoices</h2>
        <button style={s.secondaryBtn} onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}><span style={s.sectionTitle}>Export for Accountant</span></div>
        <div style={{ ...s.sectionBody, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          <div style={s.field}>
            <label style={s.label}>From Date</label>
            <input type="date" style={s.input} value={exportRange.from} onChange={e => setExportRange(r => ({ ...r, from: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>To Date</label>
            <input type="date" style={s.input} value={exportRange.to} onChange={e => setExportRange(r => ({ ...r, to: e.target.value }))} />
          </div>
          <button style={s.primaryBtn} onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          style={{ ...s.input, maxWidth: 280 }}
          placeholder="🔍  Search invoices..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {["All", ...STATUS_INVOICE].map(st => (
          <button
            key={st}
            style={filterStatus === st ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
            onClick={() => setFilter(st)}
          >{st}</button>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionBody}>
          {filtered.length === 0 && <EmptyState text="No invoices yet." />}
          {filtered.map(inv => {
            const effStatus = effectiveStatus(inv);
            return (
              <div key={inv.id} style={{
                ...s.listRow,
                border: effStatus === "Overdue" ? "1px solid #fed7aa" : "1px solid " + C.border,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* NEW — invoice number */}
                  <div style={s.listRowTitle}>
                    {inv.invoiceNumber && <span style={{ color: C.muted, fontWeight: 500, marginRight: 8, fontSize: "0.82rem" }}>{inv.invoiceNumber}</span>}
                    {inv.jobName || "Untitled Job"}
                  </div>
                  <div style={s.listRowMeta}>
                    {custName(inv)} · {fmtDate(inv.createdAt)}
                    {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString("en-CA")}`}
                    {inv.paidAt && ` · Paid ${fmtDate(inv.paidAt)}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ ...s.statusBadge, ...(STATUS_STYLE[effStatus] || STATUS_STYLE.Draft) }}>{effStatus}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: C.navy }}>{fmtCurrency(inv.total || calculateJobTotals(inv).total_with_tax)}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted }}>
                      profit {fmtCurrency(calculateJobTotals(inv).profit)} · {calculateJobTotals(inv).profit_margin.toFixed(0)}%
                    </div>
                  </div>
                  {inv.status !== "Paid" && (
                    <button style={{ ...s.primaryBtn, padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => markPaid(inv)}>
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS VIEW
// ─────────────────────────────────────────────────────────────────────────────

function CustomersView({ user, customers, quotes, invoices, onNewQuote, onOpenQuote }) {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editCust, setEditCust]   = useState(null);
  const [form, setForm]           = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving]       = useState(false);

  const filtered = customers.filter(c =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c) => {
    setEditCust(c);
    setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const openNew = () => {
    setEditCust(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, uid: user.uid, updatedAt: serverTimestamp() };
      if (editCust) {
        await updateDoc(doc(db, "customers", editCust.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "customers"), payload);
      }
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.name}? This won't delete their quotes.`)) return;
    await deleteDoc(doc(db, "customers", c.id));
    setSelected(null);
  };

  const custQuotes   = selected ? quotes.filter(q => q.customerId === selected.id) : [];
  const custInvoices = selected ? invoices.filter(i => i.customerId === selected.id) : [];

  // NEW — lifetime value per customer
  const lifetimeValue = custInvoices
    .filter(i => i.status === "Paid")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Customers</h2>
        <button style={s.primaryBtn} onClick={openNew}>+ Add Customer</button>
      </div>

      {showForm && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>{editCust ? "Edit Customer" : "New Customer"}</span>
          </div>
          <div style={s.sectionBody}>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Name *</label>
                <input style={s.input} placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Phone</label>
                <input style={s.input} placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input style={s.input} placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Address</label>
                <input style={s.input} placeholder="123 Main St, Toronto, ON" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Notes</label>
              <textarea style={s.textarea} placeholder="Property notes, access codes, etc." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Customer"}</button>
              <button style={s.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 300px", minWidth: 260 }}>
          <input
            style={{ ...s.input, marginBottom: 12 }}
            placeholder="🔍  Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 && <EmptyState text="No customers yet." />}
            {filtered.map(c => (
              <div
                key={c.id}
                style={{
                  ...s.listRow,
                  cursor: "pointer",
                  background: selected?.id === c.id ? "#eff6ff" : C.white,
                  border: selected?.id === c.id ? `1.5px solid ${C.sky}` : `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
                onClick={() => setSelected(c)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: C.navy, fontSize: "0.95rem" }}>{c.name}</div>
                  <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 2 }}>{c.phone}{c.phone && c.email ? " · " : ""}{c.email}</div>
                </div>
                <button style={{ ...s.secondaryBtn, padding: "4px 10px", fontSize: "0.78rem" }} onClick={e => { e.stopPropagation(); openEdit(c); }}>Edit</button>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={s.section}>
              <div style={{ ...s.sectionHeader, justifyContent: "space-between" }}>
                <span style={s.sectionTitle}>{selected.name}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.primaryBtn, padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => onNewQuote(selected)}>+ New Quote</button>
                  <button style={{ ...s.secondaryBtn, padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => openEdit(selected)}>Edit</button>
                  <button style={{ ...s.dangerBtn, padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => handleDelete(selected)}>Delete</button>
                </div>
              </div>
              <div style={{ ...s.sectionBody, gap: 8 }}>
                {selected.phone && <div style={s.detailLine}><span style={s.detailKey}>Phone</span><span>{selected.phone}</span></div>}
                {selected.email && <div style={s.detailLine}><span style={s.detailKey}>Email</span><span>{selected.email}</span></div>}
                {selected.address && <div style={s.detailLine}><span style={s.detailKey}>Address</span><span>{selected.address}</span></div>}
                {selected.notes && <div style={s.detailLine}><span style={s.detailKey}>Notes</span><span>{selected.notes}</span></div>}
                {/* NEW — lifetime value */}
                <div style={{ marginTop: 8, padding: "10px 14px", background: "#f0fdf4", borderRadius: 9, border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#16a34a" }}>Lifetime Value (Paid): </span>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>{fmtCurrency(lifetimeValue)}</span>
                </div>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionHeader}><span style={s.sectionTitle}>Quotes ({custQuotes.length})</span></div>
              <div style={s.sectionBody}>
                {custQuotes.length === 0 && <EmptyState text="No quotes for this customer." />}
                {custQuotes.map(q => <QuoteRow key={q.id} q={q} onClick={() => onOpenQuote(q)} />)}
              </div>
            </div>

            {custInvoices.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionHeader}><span style={s.sectionTitle}>Invoices ({custInvoices.length})</span></div>
                <div style={s.sectionBody}>
                  {custInvoices.map(inv => (
                    <div key={inv.id} style={s.listRow}>
                      <div style={{ flex: 1 }}>
                        <div style={s.listRowTitle}>
                          {inv.invoiceNumber && <span style={{ color: C.muted, fontWeight: 500, marginRight: 6, fontSize: "0.8rem" }}>{inv.invoiceNumber}</span>}
                          {inv.jobName || "Invoice"}
                        </div>
                        <div style={s.listRowMeta}>{fmtDate(inv.createdAt)}</div>
                      </div>
                      <span style={{ ...s.statusBadge, ...(STATUS_STYLE[inv.status] || STATUS_STYLE.Draft) }}>{inv.status}</span>
                      <div style={{ fontWeight: 700, color: C.navy }}>{fmtCurrency(inv.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW FEATURE — TEMPLATES VIEW
// ─────────────────────────────────────────────────────────────────────────────

function TemplatesView({ user, savedTemplates, onUseTemplate }) {
  const allTemplates = [...ONTARIO_TEMPLATES, ...savedTemplates];

  const handleDelete = async (tpl) => {
    if (!tpl.uid) return; // can't delete built-ins
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    await deleteDoc(doc(db, "templates", tpl.id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Job Templates</h2>
        <p style={{ fontSize: "0.85rem", color: C.muted }}>Start a quote from a pre-built template. Save any quote as a template from the quote editor.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {allTemplates.map((tpl, idx) => (
          <div key={tpl.id || idx} style={{ ...s.section, padding: 0 }}>
            <div style={{ ...s.sectionHeader, justifyContent: "space-between" }}>
              <div>
                <span style={s.sectionTitle}>{tpl.name}</span>
                {!tpl.uid && (
                  <span style={{ marginLeft: 8, fontSize: "0.7rem", background: "#eff6ff", color: C.sky, border: "1px solid #bfdbfe", borderRadius: 10, padding: "2px 8px" }}>Built-in</span>
                )}
              </div>
              {tpl.uid && (
                <button style={{ ...s.dangerBtn, padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => handleDelete(tpl)}>Delete</button>
              )}
            </div>
            <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: "0.82rem", color: C.muted }}>{tpl.jobType} · {tpl.hours}h @ ${tpl.hourlyRate}/hr</div>
              {tpl.materialsList && <div style={{ fontSize: "0.8rem", color: C.text, lineHeight: 1.5 }}>{tpl.materialsList.substring(0, 80)}{tpl.materialsList.length > 80 ? "…" : ""}</div>}
              {tpl.siteNotes && <div style={{ fontSize: "0.78rem", color: C.muted, fontStyle: "italic" }}>📍 {tpl.siteNotes.substring(0, 60)}…</div>}
              <button style={{ ...s.primaryBtn, marginTop: 4, textAlign: "center" }} onClick={() => onUseTemplate(tpl)}>
                Use This Template →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW FEATURE — SETTINGS VIEW
// ─────────────────────────────────────────────────────────────────────────────

function SettingsView({ user, settings }) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(user.uid, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Company Settings</h2>
      </div>

      <Section title="Company Info" icon="🏢">
        <Row>
          <Field label="Company Name">
            <input style={s.input} value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Your Plumbing Co." />
          </Field>
          <Field label="Phone">
            <input style={s.input} value={form.companyPhone} onChange={e => set("companyPhone", e.target.value)} placeholder="(905) 000-0000" />
          </Field>
        </Row>
        <Row>
          <Field label="Email">
            <input style={s.input} value={form.companyEmail} onChange={e => set("companyEmail", e.target.value)} placeholder="info@yourco.ca" />
          </Field>
          <Field label="Address">
            <input style={s.input} value={form.companyAddress} onChange={e => set("companyAddress", e.target.value)} placeholder="123 Main St, Hamilton, ON" />
          </Field>
        </Row>
        {/* NEW — HST number */}
        <Row>
          <Field label="HST / GST Registration Number">
            <input style={s.input} value={form.hstNumber} onChange={e => set("hstNumber", e.target.value)} placeholder="123456789 RT0001" />
          </Field>
        </Row>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 14px", fontSize: "0.8rem", color: "#92400e" }}>
          ⚠ Ontario requires your HST number on any invoice over $30. This number will appear on all your PDFs automatically.
        </div>
      </Section>

      <Section title="Quote Defaults" icon="⚙️">
        <Row>
          <Field label="Default Hourly Rate ($)">
            <input style={s.input} type="number" value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} />
          </Field>
          <Field label="Default Markup Multiplier">
            <input style={s.input} type="number" step="0.05" value={form.defaultMarkup} onChange={e => set("defaultMarkup", Number(e.target.value))} />
          </Field>
        </Row>
        <Row>
          <Field label="Quote Expiry (days)">
            <input style={s.input} type="number" value={form.quoteExpiryDays} onChange={e => set("quoteExpiryDays", Number(e.target.value))} />
          </Field>
          <Field label="Invoice Payment Terms (days)">
            <input style={s.input} type="number" value={form.defaultNetDays} onChange={e => set("defaultNetDays", Number(e.target.value))} />
          </Field>
        </Row>
        <Row>
          <Field label="Low Margin Warning (%)">
            <input style={s.input} type="number" value={form.defaultMarginWarning} onChange={e => set("defaultMarginWarning", Number(e.target.value))} />
          </Field>
        </Row>
      </Section>

      <button
        style={{ ...s.primaryBtn, alignSelf: "flex-start", padding: "12px 28px", fontSize: "0.95rem", background: saved ? C.green : C.navy }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : saved ? "✓ Settings Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW FEATURE — PUBLIC QUOTE APPROVAL PAGE
// ─────────────────────────────────────────────────────────────────────────────

function PublicQuoteApproval({ quoteId }) {
  const [quote, setQuote]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction]   = useState(null); // "approved" | "declined"

  useEffect(() => {
    getDoc(doc(db, "quotes", quoteId)).then(snap => {
      if (snap.exists()) setQuote({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [quoteId]);

  const handleApprove = async () => {
    await updateDoc(doc(db, "quotes", quoteId), { status: "Approved", approvedAt: serverTimestamp() });
    setAction("approved");
  };

  const handleDecline = async () => {
    await updateDoc(doc(db, "quotes", quoteId), { status: "Rejected", rejectedAt: serverTimestamp() });
    setAction("declined");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", background: C.light }}>
      <div style={{ color: C.muted }}>Loading quote…</div>
    </div>
  );

  if (!quote) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", background: C.light }}>
      <div style={{ color: C.danger }}>Quote not found.</div>
    </div>
  );

  if (action === "approved") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", background: "#f0fdf4" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", color: "#15803d", fontSize: "1.8rem" }}>Quote Approved!</h2>
        <p style={{ color: "#16a34a", marginTop: 8 }}>Thank you. Your contractor will be in touch shortly.</p>
      </div>
    </div>
  );

  if (action === "declined") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", background: "#fef2f2" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>❌</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", color: "#dc2626", fontSize: "1.8rem" }}>Quote Declined</h2>
        <p style={{ color: "#dc2626", marginTop: 8 }}>Your contractor has been notified.</p>
      </div>
    </div>
  );

  const alreadyActioned = quote.status === "Approved" || quote.status === "Rejected" || quote.status === "Expired";

  return (
    <div style={{ minHeight: "100vh", background: C.light, fontFamily: "'DM Sans', sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: C.navy, borderRadius: 16, padding: "24px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: C.white }}>
              Plumb<span style={{ color: C.sky }}>Quote</span> 3
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 4 }}>Quote for your review</div>
          </div>
          {quote.quoteNumber && (
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", color: C.accent, fontWeight: 700, fontSize: "1rem" }}>
              {quote.quoteNumber}
            </div>
          )}
        </div>

        {/* Quote details */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ ...s.sectionHeader }}>
            <span style={s.sectionTitle}>Quote Details</span>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {quote.jobName && <div style={s.detailLine}><span style={s.detailKey}>Job</span><span style={{ fontWeight: 600 }}>{quote.jobName}</span></div>}
            {(quote.clientName) && <div style={s.detailLine}><span style={s.detailKey}>Prepared for</span><span>{quote.clientName}</span></div>}
            {quote.jobType && <div style={s.detailLine}><span style={s.detailKey}>Job Type</span><span>{quote.jobType}</span></div>}
            {quote.expiryDate && <div style={s.detailLine}><span style={s.detailKey}>Valid Until</span><span>{new Date(quote.expiryDate).toLocaleDateString("en-CA")}</span></div>}
            {quote.siteNotes && <div style={s.detailLine}><span style={s.detailKey}>Notes</span><span>{quote.siteNotes}</span></div>}
          </div>
        </div>

        {/* Totals */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: 16 }}>
          <div style={s.summaryLine}><span>Subtotal</span><span>{fmtCurrency(quote.subtotal)}</span></div>
          <div style={{ ...s.summaryLine, color: C.sky }}><span>HST (13%)</span><span>{fmtCurrency(quote.hst)}</span></div>
          <div style={s.summaryDivider} />
          <div style={s.summaryTotal}><span>Total</span><span>{fmtCurrency(quote.total)}</span></div>
        </div>

        {/* Action buttons */}
        {alreadyActioned ? (
          <div style={{ textAlign: "center", padding: "20px", background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <span style={{ ...s.statusBadge, ...STATUS_STYLE[quote.status], fontSize: "0.9rem", padding: "8px 18px" }}>{quote.status}</span>
            <p style={{ marginTop: 12, color: C.muted, fontSize: "0.85rem" }}>This quote has already been {quote.status.toLowerCase()}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{ ...s.primaryBtn, flex: 1, padding: "16px", fontSize: "1rem", background: "#16a34a", textAlign: "center" }}
              onClick={handleApprove}
            >
              ✓ Approve Quote
            </button>
            <button
              style={{ ...s.dangerBtn, flex: 1, padding: "16px", fontSize: "1rem", textAlign: "center" }}
              onClick={handleDecline}
            >
              ✕ Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE EDITOR
// ─────────────────────────────────────────────────────────────────────────────

function QuoteEditor({ user, quoteData, customers, quotes, settings, onSaved, onConvertToInvoice }) {
  const tpl = quoteData?._template;

  const [jobName,     setJobName]     = useState(quoteData?.jobName     || tpl?.name     || "");
  const [customerId,  setCustomerId]  = useState(quoteData?.customerId  || "");
  const [status,      setStatus]      = useState(quoteData?.status      || "Draft");
  const [saving,      setSaving]      = useState(false);
  const [pdfSuccess,  setPdfSuccess]  = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false); // NEW
  const [templateName, setTemplateName] = useState(""); // NEW
  const [savingTemplate, setSavingTemplate] = useState(false); // NEW
  const [shareUrl, setShareUrl]       = useState(quoteData?.id ? `${window.location.origin}${window.location.pathname}?quote=${quoteData.id}` : null); // NEW

  // NEW — site notes
  const [siteNotes, setSiteNotes] = useState(quoteData?.siteNotes || tpl?.siteNotes || "");

  const [companyName, setCompanyName] = useState(quoteData?.companyName || settings?.companyName || "Plumb Quote 3");
  const [clientName,  setClientName]  = useState(quoteData?.clientName  || (quoteData?.customer?.name || ""));
  const [jobType,     setJobType]     = useState(quoteData?.jobType     || tpl?.jobType    || "Drain Cleaning");
  const [hours,       setHours]       = useState(quoteData?.hours       ?? tpl?.hours      ?? settings?.defaultHourlyRate !== undefined ? 1 : 1);
  const [hourlyRate,  setHourlyRate]  = useState(quoteData?.hourlyRate  ?? tpl?.hourlyRate ?? settings?.defaultHourlyRate ?? 120);
  const [materialCost,setMaterialCost]= useState(quoteData?.materialCost ?? tpl?.materialCost ?? 0);
  const [markup,      setMarkup]      = useState(quoteData?.markup       ?? tpl?.markup    ?? settings?.defaultMarkup ?? 1.4);
  const [materialsList,setMaterialsList]=useState(quoteData?.materialsList || tpl?.materialsList || "");
  const [logo,        setLogo]        = useState(quoteData?.logo        || null);
  const [fixtures,    setFixtures]    = useState(quoteData?.fixtures    || tpl?.fixtures   || [{ name: "", labour: 0, qty: 1 }]);
  const [pipes,       setPipes]       = useState(quoteData?.pipes       || buildDefaultPipes());
  const [fittings,    setFittings]    = useState(quoteData?.fittings    || buildDefaultFittings());
  const [roughLabour, setRoughLabour] = useState(quoteData?.roughLabour ?? 0);
  // NEW — subcontractor cost
  const [subContractorCost, setSubContractorCost] = useState(quoteData?.subContractorCost ?? tpl?.subContractorCost ?? 0);

  useEffect(() => {
    if (customerId) {
      const c = customers.find(c => c.id === customerId);
      if (c && !clientName) setClientName(c.name);
    }
  }, [customerId]);

  const handleLogoUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(e.target.files[0]);
  };

  const addFixture    = () => setFixtures([...fixtures, { name: "", labour: 0, qty: 1 }]);
  const removeFixture = (i) => setFixtures(fixtures.filter((_, idx) => idx !== i));
  const updateFixture = (i, field, value) => {
    const u = [...fixtures]; u[i][field] = value; setFixtures(u);
  };

  const addPipeRow    = () => setPipes([...pipes, newPipeRow()]);
  const removePipeRow = (i) => { if (pipes.length > 1) setPipes(pipes.filter((_, idx) => idx !== i)); };
  const updatePipe = (i, field, value) => {
    const u = [...pipes]; u[i][field] = value;
    if (field === "type" || field === "size") {
      const t  = field === "type" ? value : u[i].type;
      const sz = field === "size" ? value : u[i].size;
      if (PIPE_PRICING[t]?.[sz] !== undefined) {
        u[i].pricePerFt = PIPE_PRICING[t][sz];
        u[i].costPerFt  = PIPE_PRICING[t][sz]; // NEW — sync cost
      }
    }
    setPipes(u);
  };

  const updateFitting = (i, field, value) => {
    const u = [...fittings]; u[i][field] = value;
    if (field === "material" || field === "size") {
      const mat = field === "material" ? value : u[i].material;
      const sz  = field === "size"     ? value : u[i].size;
      const fp  = FITTING_PRICING[mat]?.[u[i].key]?.[sz];
      if (fp !== undefined) {
        u[i].unitPrice = fp;
        u[i].unitCost  = fp; // NEW — sync cost
      }
    }
    setFittings(u);
  };

  // PROFIT FIX — all calculations flow through the central engine
  const calc = calculateJobTotals({
    jobType, hours, hourlyRate, materialCost, markup,
    fixtures, pipes, fittings, roughLabour, subContractorCost,
  });

  // Convenience aliases so existing JSX below keeps working unchanged
  const laborCost     = calc.labour_revenue;
  const materials     = calc.material_revenue;
  const fixtureTotal  = calc.labour_revenue;
  const pipesTotal    = pipes.reduce((s, p) => s + Number(p.length || 0) * Number(p.pricePerFt || 0), 0);
  const fittingsTotal = fittings.reduce((s, f) => s + Number(f.qty || 0) * Number(f.unitPrice || 0), 0);
  const roughInTotal  = pipesTotal + fittingsTotal + Number(roughLabour);
  const subtotal      = calc.total_price;
  const hst           = calc.hst;
  const total         = calc.total_with_tax;
  const profit        = calc.profit;
  const profitPct     = calc.profit_margin.toFixed(1);
  const marginWarning = calc.profit_margin < (settings?.defaultMarginWarning || LOW_MARGIN_THRESHOLD);

  const handleSave = async () => {
    // NEW — warn on low margin before saving
    if (marginWarning && profit > 0) {
      const ok = window.confirm(`⚠ This job is only ${profitPct}% margin. Are you sure you want to save?`);
      if (!ok) return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(quoteData?.id ? { id: quoteData.id } : {}),
        jobName, customerId, status, companyName, clientName, jobType,
        hours, hourlyRate, materialCost, markup, materialsList, logo,
        fixtures, pipes, fittings, roughLabour,
        siteNotes, subContractorCost,
        // PROFIT FIX — store all calculated fields from central engine
        subtotal:         calc.total_price,
        hst:              calc.hst,
        total:            calc.total_with_tax,
        profit:           calc.profit,
        profit_margin:    calc.profit_margin,
        material_cost:    calc.material_cost,
        material_revenue: calc.material_revenue,
        labour_revenue:   calc.labour_revenue,
        pipesTotal, fittingsTotal, roughInTotal,
      };
      const saved = await saveQuote(payload, user.uid, settings);
      // NEW — set share URL after first save
      if (!shareUrl) setShareUrl(`${window.location.origin}${window.location.pathname}?quote=${saved.id}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onSaved(saved);
    } finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (!quoteData?.id) { alert("Save the quote first."); return; }
    await onConvertToInvoice({ ...quoteData, jobName, customerId, status, siteNotes, subtotal, hst, total, profit, subContractorCost });
  };

  // NEW — save as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await saveAsTemplate(user.uid, {
        name: templateName, jobName, jobType, hours, hourlyRate, materialCost,
        markup, materialsList, fixtures, pipes, fittings, roughLabour,
        siteNotes, subContractorCost,
      }, templateName);
      setShowSaveTemplateModal(false);
      setTemplateName("");
      alert("Template saved! Find it in the Templates tab.");
    } finally { setSavingTemplate(false); }
  };

  // NEW — copy share link
  const copyShareLink = () => {
    if (!shareUrl) { alert("Save the quote first to generate a share link."); return; }
    navigator.clipboard.writeText(shareUrl);
    alert("Share link copied! Send it to your customer — they can approve or decline the quote from their browser.");
  };

  const generatePDF = () => {
    const pdfdoc  = new jsPDF();
    const pageW = 210;
    const L = 15, R = pageW - 15;

    if (logo) pdfdoc.addImage(logo, "PNG", R - 40, 10, 40, 20);
    pdfdoc.setFontSize(22); pdfdoc.setTextColor(13, 31, 60);
    pdfdoc.text(companyName, L, 22);
    pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146);
    // NEW — company details from settings
    if (settings?.companyAddress) { pdfdoc.text(settings.companyAddress, L, 30); }
    if (settings?.companyPhone)   { pdfdoc.text(settings.companyPhone, L, 36); }
    if (settings?.companyEmail)   { pdfdoc.text(settings.companyEmail, L, 42); }

    // NEW — quote number top right
    if (quoteData?.quoteNumber) {
      pdfdoc.setFontSize(14); pdfdoc.setTextColor(13, 31, 60); pdfdoc.setFont(undefined, "bold");
      pdfdoc.text(quoteData.quoteNumber, R, 22, { align: "right" });
      pdfdoc.setFont(undefined, "normal");
    }

    pdfdoc.setFontSize(10); pdfdoc.setTextColor(99, 117, 146);
    let infoY = settings?.companyAddress ? 50 : 32;
    pdfdoc.text("Client: " + (clientName || "\u2014"), L, infoY);
    pdfdoc.text("Job: " + (jobName || jobType), L, infoY + 7);
    pdfdoc.text("Date: " + new Date().toLocaleDateString("en-CA"), L, infoY + 14);
    if (quoteData?.expiryDate) pdfdoc.text("Valid until: " + new Date(quoteData.expiryDate).toLocaleDateString("en-CA"), L, infoY + 21);

    pdfdoc.setDrawColor(212, 225, 245); pdfdoc.setLineWidth(0.5);
    pdfdoc.line(L, infoY + 27, R, infoY + 27);

    let y = infoY + 37;

    // NEW — site notes on PDF
    if (siteNotes) {
      pdfdoc.setFontSize(9); pdfdoc.setTextColor(146, 64, 14);
      pdfdoc.setFillColor(255, 251, 235);
      pdfdoc.roundedRect(L, y - 4, R - L, 12, 2, 2, "F");
      pdfdoc.text("Site Notes: " + siteNotes, L + 3, y + 4);
      y += 18;
    }

    const sectionHeader = (title) => {
      pdfdoc.setFillColor(240, 245, 252);
      pdfdoc.roundedRect(L, y - 5, R - L, 10, 2, 2, "F");
      pdfdoc.setFontSize(11); pdfdoc.setTextColor(13, 31, 60); pdfdoc.setFont(undefined, "bold");
      pdfdoc.text(title, L + 3, y + 2); pdfdoc.setFont(undefined, "normal"); y += 12;
    };
    const colHeader = (cols) => {
      pdfdoc.setFontSize(8); pdfdoc.setTextColor(99, 117, 146);
      cols.forEach(([txt, x, align]) => {
        if (align === "right") { const w = pdfdoc.getTextWidth(txt); pdfdoc.text(txt, x - w, y); }
        else pdfdoc.text(txt, x, y);
      });
      y += 4; pdfdoc.setDrawColor(212, 225, 245); pdfdoc.setLineWidth(0.3);
      pdfdoc.line(L, y, R, y); y += 6;
    };
    const dataRow = (cols, shade) => {
      if (shade) { pdfdoc.setFillColor(248, 251, 255); pdfdoc.rect(L, y - 5, R - L, 8, "F"); }
      pdfdoc.setFontSize(9); pdfdoc.setTextColor(42, 58, 82);
      cols.forEach(([txt, x, align]) => {
        if (align === "right") { const w = pdfdoc.getTextWidth(String(txt)); pdfdoc.text(String(txt), x - w, y); }
        else pdfdoc.text(String(txt), x, y);
      });
      y += 9;
    };
    const subtotalLine = (label, val) => {
      pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146);
      pdfdoc.text(label, 130, y);
      pdfdoc.setTextColor(13, 31, 60); pdfdoc.setFont(undefined, "bold");
      const w = pdfdoc.getTextWidth("$" + val);
      pdfdoc.text("$" + val, R - w, y); pdfdoc.setFont(undefined, "normal"); y += 8;
    };

    if (jobType === "Rough In") {
      sectionHeader("Rough-In Piping");
      colHeader([["Pipe Type", L + 2, "left"], ["Size", 62, "left"], ["Length", 95, "left"], ["$/ft", 128, "left"], ["Cost", R, "right"]]);
      const activePipes = pipes.filter(p => Number(p.length) > 0);
      if (activePipes.length === 0) { pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146); pdfdoc.text("No piping entered.", L + 2, y); y += 9; }
      else activePipes.forEach((p, idx) => {
        dataRow([[p.type, L + 2, "left"], [p.size, 62, "left"], [p.length + " ft", 95, "left"], ["$" + Number(p.pricePerFt).toFixed(2), 128, "left"], ["$" + (Number(p.length) * Number(p.pricePerFt)).toFixed(2), R, "right"]], idx % 2 === 0);
      });
      subtotalLine("Piping Subtotal", pipesTotal.toFixed(2)); y += 4;

      sectionHeader("Rough-In Fittings");
      colHeader([["Fitting", L + 2, "left"], ["Material", 55, "left"], ["Size", 85, "left"], ["Qty", 112, "left"], ["Unit", 135, "left"], ["Total", R, "right"]]);
      const activeFittings = fittings.filter(f => Number(f.qty) > 0);
      if (activeFittings.length === 0) { pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146); pdfdoc.text("No fittings entered.", L + 2, y); y += 9; }
      else activeFittings.forEach((f, idx) => {
        dataRow([[f.label, L + 2, "left"], [f.material, 55, "left"], [f.size, 85, "left"], [String(f.qty), 112, "left"], ["$" + Number(f.unitPrice).toFixed(2), 135, "left"], ["$" + (Number(f.qty) * Number(f.unitPrice)).toFixed(2), R, "right"]], idx % 2 === 0);
      });
      subtotalLine("Fittings Subtotal", fittingsTotal.toFixed(2)); y += 4;

      if (Number(roughLabour) > 0) {
        sectionHeader("Labour");
        dataRow([["Rough-In Labour", L + 2, "left"], ["$" + Number(roughLabour).toFixed(2), R, "right"]], false); y += 2;
      }
    } else if (jobType === "Fixture Install") {
      sectionHeader("Fixture Install Labour");
      colHeader([["Fixture", L + 2, "left"], ["Qty", 120, "left"], ["Total", R, "right"]]);
      fixtures.filter(f => f.name && f.labour > 0).forEach((f, idx) => {
        dataRow([[f.name + " install", L + 2, "left"], ["x" + f.qty, 120, "left"], ["$" + (Number(f.labour) * Number(f.qty)).toFixed(2), R, "right"]], idx % 2 === 0);
      });
      y += 4;
    } else {
      sectionHeader("Labour & Materials");
      dataRow([["Labour", L + 2, "left"], ["$" + laborCost.toFixed(2), R, "right"]], false);
      dataRow([["Materials (incl. markup)", L + 2, "left"], ["$" + materials.toFixed(2), R, "right"]], true); y += 4;
    }

    // NEW — subcontractor line on PDF
    if (Number(subContractorCost) > 0) {
      dataRow([["Subcontractor / Helper", L + 2, "left"], ["$" + Number(subContractorCost).toFixed(2), R, "right"]], false);
    }

    pdfdoc.setDrawColor(212, 225, 245); pdfdoc.setLineWidth(0.5); pdfdoc.line(L, y, R, y); y += 8;
    pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146);
    pdfdoc.text("Subtotal", 130, y);
    const sw = pdfdoc.getTextWidth("$" + subtotal.toFixed(2));
    pdfdoc.setTextColor(42, 58, 82); pdfdoc.text("$" + subtotal.toFixed(2), R - sw, y); y += 8;
    pdfdoc.setTextColor(99, 117, 146); pdfdoc.text("HST (13%)", 130, y);
    const hw = pdfdoc.getTextWidth("$" + hst.toFixed(2));
    pdfdoc.setTextColor(42, 58, 82); pdfdoc.text("$" + hst.toFixed(2), R - hw, y); y += 5;
    pdfdoc.setDrawColor(13, 31, 60); pdfdoc.setLineWidth(0.7); pdfdoc.line(130, y, R, y); y += 8;
    pdfdoc.setFontSize(13); pdfdoc.setTextColor(13, 31, 60); pdfdoc.setFont(undefined, "bold");
    pdfdoc.text("TOTAL", 130, y);
    const tw = pdfdoc.getTextWidth("$" + total.toFixed(2));
    pdfdoc.text("$" + total.toFixed(2), R - tw, y); pdfdoc.setFont(undefined, "normal");

    if (jobType !== "Rough In" && materialsList) {
      y += 16; pdfdoc.setFontSize(9); pdfdoc.setTextColor(99, 117, 146);
      pdfdoc.text("Materials Used:", L, y); y += 6;
      pdfdoc.setTextColor(42, 58, 82); pdfdoc.text(materialsList, L, y);
    }

    // NEW — HST number footer
    const footerParts = ["Generated by PlumbQuote 3  •  Prices are estimates only."];
    if (settings?.hstNumber) footerParts.push("HST/GST Reg: " + settings.hstNumber);
    pdfdoc.setFontSize(8); pdfdoc.setTextColor(180, 195, 215);
    pdfdoc.text(footerParts.join("  •  "), L, 285);

    pdfdoc.save((clientName || jobName || "quote") + ".pdf");
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── TOTAL BANNER — PROFIT FIX */}
      <div style={s.totalBanner}>
        <div>
          <div style={s.totalLabel}>Estimated Total</div>
          <div style={s.totalAmount}>{fmtCurrency(calc.total_with_tax)}</div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>incl. HST (13%)</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>PROFIT</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: profit >= 0 ? "#4ade80" : "#f87171" }}>
              {fmtCurrency(profit)}
            </div>
            <div style={{ fontSize: "0.7rem", color: profit >= 0 ? "#4ade80" : "#f87171", marginTop: 2 }}>
              {profitPct}% margin
            </div>
            {marginWarning && profit > 0 && (
              <div style={{ fontSize: "0.7rem", color: "#fbbf24", marginTop: 2 }}>⚠ Low margin</div>
            )}
          </div>
          <button style={pdfSuccess ? { ...s.pdfBtn, ...s.pdfBtnSuccess } : s.pdfBtn} onClick={generatePDF}>
            {pdfSuccess ? "✓ Downloaded!" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* NEW — low margin warning banner */}
      {marginWarning && profit > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 18px", fontSize: "0.85rem", color: "#c2410c" }}>
          ⚠ <strong>Low margin warning:</strong> This job is {profitPct}% margin. Consider reviewing your rates or material costs before sending.
        </div>
      )}

      {/* ── Quote meta bar */}
      <div style={s.section}>
        <div style={s.sectionHeader}><span style={s.sectionTitle}>Quote Info</span></div>
        <div style={s.sectionBody}>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Job Name</label>
              <input style={s.input} placeholder="e.g. Kitchen Rough-In" value={jobName} onChange={e => setJobName(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Customer</label>
              <select style={s.input} value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">— Select customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Status</label>
              <select style={s.input} value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_QUOTE.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {/* NEW — site notes */}
          <div style={s.field}>
            <label style={s.label}>Site / Job Notes</label>
            <textarea
              style={{ ...s.textarea, minHeight: 60 }}
              placeholder="Access codes, gate entry, dog on property, shut-off location, special instructions..."
              value={siteNotes}
              onChange={e => setSiteNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={saveSuccess ? { ...s.primaryBtn, background: C.green } : s.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "💾 Save Quote"}
            </button>
            {quoteData?.id && (
              <button style={s.secondaryBtn} onClick={handleConvert}>
                🧾 Convert to Invoice
              </button>
            )}
            {/* NEW — share link button */}
            <button style={s.secondaryBtn} onClick={copyShareLink}>
              🔗 {shareUrl ? "Copy Share Link" : "Save First to Share"}
            </button>
            {/* NEW — save as template */}
            <button style={s.secondaryBtn} onClick={() => { setTemplateName(jobName || ""); setShowSaveTemplateModal(true); }}>
              📋 Save as Template
            </button>
          </div>

          {/* NEW — share link display */}
          {shareUrl && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "10px 14px", fontSize: "0.8rem", color: C.blue }}>
              <strong>Customer approval link:</strong> Send this URL to your customer — they can approve or decline without logging in.
              <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all", color: C.sky }}>
                {shareUrl}
              </div>
            </div>
          )}

          {/* NEW — save as template modal (inline) */}
          {showSaveTemplateModal && (
            <div style={{ background: C.light, borderRadius: 10, padding: "16px", border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: "0.9rem" }}>Save as Template</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  placeholder="Template name (e.g. Standard Toilet Install)"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
                <button style={s.primaryBtn} onClick={handleSaveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? "Saving…" : "Save"}
                </button>
                <button style={s.secondaryBtn} onClick={() => setShowSaveTemplateModal(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── JOB DETAILS */}
      <Section title="Job Details" icon="📋">
        <Row>
          <Field label="Company Name">
            <input style={s.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" />
          </Field>
          <Field label="Client Name">
            <input style={s.input} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client full name" />
          </Field>
        </Row>
        <Row>
          <Field label="Job Type">
            <select style={s.input} value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Upload Logo">
            <label style={s.fileLabel}>
              {logo ? "✓ Logo uploaded" : "Choose file"}
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            </label>
          </Field>
        </Row>
      </Section>

      {/* ── ROUGH-IN */}
      {jobType === "Rough In" && (
        <>
          <Section title="Rough-In — Piping" icon="🔩">
            <div style={s.roughDisclaimer}>
              ⚠ Prices auto-fill from Ontario supply baselines. All values are editable.
            </div>
            {pipes.map((p, i) => (
              <div key={i} style={s.roughCard}>
                <div style={s.roughCardHeader}>
                  <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                    <select style={{ ...s.input, flex: "1 1 90px", minWidth: 80 }} value={p.type} onChange={(e) => updatePipe(i, "type", e.target.value)}>
                      {Object.keys(PIPE_PRICING).map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select style={{ ...s.input, flex: "1 1 80px", minWidth: 70 }} value={p.size} onChange={(e) => updatePipe(i, "size", e.target.value)}>
                      {PIPE_SIZES.map(sz => <option key={sz}>{sz}</option>)}
                    </select>
                  </div>
                  <button style={{ ...s.removeBtn, flexShrink: 0, opacity: pipes.length === 1 ? 0.3 : 1, minWidth: 36, minHeight: 36 }} onClick={() => removePipeRow(i)} disabled={pipes.length === 1}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={s.roughFieldLabel}>Length (ft)</div>
                    <input style={s.input} type="number" min="0" placeholder="0" value={p.length || ""} onChange={(e) => updatePipe(i, "length", e.target.value)} />
                  </div>
                  <div>
                    <div style={s.roughFieldLabel}>$/ft (sell)</div>
                    <input style={s.input} type="number" min="0" step="0.01" value={p.pricePerFt} onChange={(e) => updatePipe(i, "pricePerFt", e.target.value)} />
                  </div>
                  <div>
                    <div style={s.roughFieldLabel}>$/ft (cost)</div>
                    <input style={{ ...s.input, background: "#fffbeb" }} type="number" min="0" step="0.01" value={p.costPerFt || p.pricePerFt} onChange={(e) => updatePipe(i, "costPerFt", e.target.value)} />
                  </div>
                </div>
                <div style={s.roughCardTotal}>
                  Revenue: <strong>${(Number(p.length) * Number(p.pricePerFt)).toFixed(2)}</strong>
                </div>
              </div>
            ))}
            <button style={s.addBtn} onClick={addPipeRow}>+ Add Pipe</button>
            <div style={s.subtotalRow}><span>Piping Subtotal</span><span style={s.subtotalVal}>${pipesTotal.toFixed(2)}</span></div>
          </Section>

          <Section title="Rough-In — Fittings" icon="🔧">
            <div style={s.roughDisclaimer}>
              ⚠ Copper fittings are significantly higher than PVC/ABS. Prices auto-update on material/size change.
            </div>
            {fittings.map((f, i) => (
              <div key={i} style={s.roughCard}>
                <div style={s.roughCardHeader}>
                  <div style={{ ...s.roughTypeTag, flex: "none" }}>{f.label}</div>
                  <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                    <select style={{ ...s.input, flex: "1 1 80px", minWidth: 70 }} value={f.material} onChange={(e) => updateFitting(i, "material", e.target.value)}>
                      {Object.keys(FITTING_PRICING).map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select style={{ ...s.input, flex: "1 1 70px", minWidth: 65 }} value={f.size} onChange={(e) => updateFitting(i, "size", e.target.value)}>
                      {FITTING_SIZES.map(sz => <option key={sz}>{sz}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={s.roughFieldLabel}>Qty</div>
                    <input style={s.input} type="number" min="0" placeholder="0" value={f.qty || ""} onChange={(e) => updateFitting(i, "qty", e.target.value)} />
                  </div>
                  <div>
                    <div style={s.roughFieldLabel}>Sell $</div>
                    <input style={s.input} type="number" min="0" step="0.01" value={f.unitPrice} onChange={(e) => updateFitting(i, "unitPrice", e.target.value)} />
                  </div>
                  <div>
                    <div style={s.roughFieldLabel}>Cost $</div>
                    <input style={{ ...s.input, background: "#fffbeb" }} type="number" min="0" step="0.01" value={f.unitCost || f.unitPrice} onChange={(e) => updateFitting(i, "unitCost", e.target.value)} />
                  </div>
                </div>
                {Number(f.qty) > 0 && (
                  <div style={s.roughCardTotal}>
                    Total: <strong>${(Number(f.qty) * Number(f.unitPrice)).toFixed(2)}</strong>
                  </div>
                )}
              </div>
            ))}
            <div style={s.subtotalRow}><span>Fittings Subtotal</span><span style={s.subtotalVal}>${fittingsTotal.toFixed(2)}</span></div>
          </Section>

          <Section title="Rough-In — Labour" icon="👷">
            <Row>
              <Field label="Labour Cost ($)">
                <input style={s.input} type="number" min="0" placeholder="0.00" value={roughLabour || ""} onChange={(e) => setRoughLabour(e.target.value)} />
              </Field>
              <Field label="Total Rough-In (sell)">
                <div style={s.calcDisplay}>${roughInTotal.toFixed(2)}</div>
              </Field>
            </Row>
          </Section>
        </>
      )}

      {/* ── LABOUR */}
      {jobType !== "Rough In" && (
        <Section title="Labour" icon="🔧">
          {jobType === "Fixture Install" ? (
            <>
              {fixtures.map((f, i) => (
                <div key={i} style={s.roughCard}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="Fixture (e.g. Toilet)" value={f.name} onChange={(e) => updateFixture(i, "name", e.target.value)} />
                    {fixtures.length > 1 && (
                      <button style={{ ...s.removeBtn, flexShrink: 0, minWidth: 36, minHeight: 36 }} onClick={() => removeFixture(i)}>✕</button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
                    <div>
                      <div style={s.roughFieldLabel}>Labour $</div>
                      <input style={s.input} type="number" placeholder="0" value={f.labour} onChange={(e) => updateFixture(i, "labour", e.target.value)} />
                    </div>
                    <div>
                      <div style={s.roughFieldLabel}>Qty</div>
                      <input style={s.input} type="number" placeholder="1" value={f.qty} onChange={(e) => updateFixture(i, "qty", e.target.value)} />
                    </div>
                    <div>
                      <div style={s.roughFieldLabel}>Total</div>
                      <div style={{ ...s.calcDisplay, fontSize: "0.9rem" }}>${(Number(f.labour) * Number(f.qty)).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
              <button style={s.addBtn} onClick={addFixture}>+ Add Fixture</button>
              <div style={s.subtotalRow}><span>Fixture Labour Subtotal</span><span style={s.subtotalVal}>${fixtureTotal.toFixed(2)}</span></div>
            </>
          ) : (
            <Row>
              <Field label="Hourly Rate ($)">
                <input style={s.input} type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
              </Field>
              <Field label="Hours">
                <input style={s.input} type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </Field>
              <Field label="Labour Cost">
                <div style={s.calcDisplay}>${laborCost.toFixed(2)}</div>
              </Field>
            </Row>
          )}
        </Section>
      )}

      {/* ── MATERIALS */}
      {jobType !== "Rough In" && (
        <Section title="Materials" icon="🪛">
          <Row>
            <Field label="Material Cost ($)">
              <input style={s.input} type="number" value={materialCost} onChange={(e) => setMaterialCost(Number(e.target.value))} />
            </Field>
            <Field label="Markup Multiplier">
              <input style={s.input} type="number" step="0.05" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} />
            </Field>
            <Field label="Marked Up Total">
              <div style={s.calcDisplay}>${materials.toFixed(2)}</div>
            </Field>
          </Row>
          <Field label="Materials List (for PDF)">
            <textarea style={s.textarea} placeholder="e.g. 10m copper pipe, 2x ball valves, solder..." value={materialsList} onChange={(e) => setMaterialsList(e.target.value)} />
          </Field>
        </Section>
      )}

      {/* NEW — Subcontractor / Helper Section */}
      <Section title="Subcontractor / Helper Cost" icon="👥">
        <Row>
          <Field label="Subcontractor / Helper Cost ($)">
            <input
              style={s.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={subContractorCost || ""}
              onChange={e => setSubContractorCost(Number(e.target.value))}
            />
          </Field>
          <Field label="">
            <div style={{ ...s.calcDisplay, fontSize: "0.8rem", color: C.muted, padding: "10px 14px" }}>
              This cost is tracked internally and reduces your profit. It does not appear on the customer's quote.
            </div>
          </Field>
        </Row>
      </Section>

      {/* ── SUMMARY — PROFIT FIX: all values from calculateJobTotals */}
      <div style={s.summaryCard}>
        <div style={s.summaryTitle}>Quote Summary</div>

        {/* Revenue breakdown */}
        <div style={{ ...s.summaryLine, fontSize: "0.82rem", color: C.muted, fontWeight: 600, paddingBottom: 4 }}>
          <span>REVENUE BREAKDOWN</span>
        </div>
        <div style={s.summaryLine}>
          <span>Labour revenue</span>
          <span>{fmtCurrency(calc.labour_revenue)}</span>
        </div>
        <div style={s.summaryLine}>
          <span>Material revenue (incl. markup)</span>
          <span>{fmtCurrency(calc.material_revenue)}</span>
        </div>

        {/* Cost breakdown */}
        <div style={{ ...s.summaryLine, fontSize: "0.82rem", color: C.muted, fontWeight: 600, paddingBottom: 4, paddingTop: 8 }}>
          <span>COST BREAKDOWN</span>
        </div>
        <div style={s.summaryLine}>
          <span>Material cost (what you paid)</span>
          <span style={{ color: C.danger }}>−{fmtCurrency(calc.material_cost)}</span>
        </div>
        {Number(subContractorCost) > 0 && (
          <div style={{ ...s.summaryLine, color: C.muted, fontStyle: "italic" }}>
            <span>Subcontractor (internal)</span>
            <span style={{ color: C.danger }}>−{fmtCurrency(subContractorCost)}</span>
          </div>
        )}

        <div style={{ borderTop: "1.5px solid " + C.border, marginTop: 8 }} />
        <div style={s.summaryLine}><span>Subtotal</span><span>{fmtCurrency(calc.total_price)}</span></div>
        <div style={{ ...s.summaryLine, color: C.sky }}><span>HST (13%)</span><span>{fmtCurrency(calc.hst)}</span></div>
        <div style={s.summaryDivider} />
        <div style={s.summaryTotal}><span>Total</span><span>{fmtCurrency(calc.total_with_tax)}</span></div>

        {/* Profit — PROFIT FIX: profit = total_price - material_cost (labour never subtracted) */}
        <div style={{
          background: profit >= 0 ? (marginWarning ? "#fff7ed" : "#f0fdf4") : "#fef2f2",
          border: `1px solid ${profit >= 0 ? (marginWarning ? "#fed7aa" : "#bbf7d0") : "#fecaca"}`,
          borderRadius: 10, padding: "12px 14px", marginTop: 12,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.muted, marginBottom: 2 }}>
              Profit {marginWarning && profit > 0 ? "— ⚠ Low margin" : ""}
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: profit >= 0 ? (marginWarning ? "#c2410c" : "#16a34a") : C.danger }}>
              {fmtCurrency(profit)}
            </div>
          </div>
          <div style={{
            background: profit >= 0 ? (marginWarning ? "#fed7aa" : "#bbf7d0") : "#fecaca",
            borderRadius: 8, padding: "8px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 2 }}>MARGIN</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: profit >= 0 ? (marginWarning ? "#c2410c" : "#16a34a") : C.danger }}>
              {profitPct}%
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button style={pdfSuccess ? { ...s.pdfBtnFull, ...s.pdfBtnSuccess } : s.pdfBtnFull} onClick={generatePDF}>
            {pdfSuccess ? "✓ PDF Downloaded!" : "⬇ Download Quote PDF"}
          </button>
          <button style={{ ...s.pdfBtnFull, background: C.blue, boxShadow: "none", flex: "0 1 auto", padding: "14px 20px" }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "💾 Save"}
          </button>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function QuoteRow({ q, custName, onClick, onDuplicate, showDuplicate }) {
  // PROFIT FIX — recalculate on render so list always shows correct margin
  const calc = calculateJobTotals(q);
  return (
    <div style={{ ...s.listRow, cursor: "pointer" }} onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.listRowTitle}>
          {q.quoteNumber && <span style={{ color: C.muted, fontWeight: 500, marginRight: 8, fontSize: "0.8rem" }}>{q.quoteNumber}</span>}
          {q.jobName || q.jobType || "Untitled"}
        </div>
        <div style={s.listRowMeta}>
          {custName || q.clientName || "—"} · {fmtDate(q.createdAt)}
          {q.expiryDate && ` · Exp ${new Date(q.expiryDate).toLocaleDateString("en-CA")}`}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ ...s.statusBadge, ...(STATUS_STYLE[q.status] || STATUS_STYLE.Draft) }}>{q.status || "Draft"}</span>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.95rem" }}>{fmtCurrency(q.total || calc.total_with_tax)}</div>
          <div style={{ fontSize: "0.73rem", color: calc.profit_margin < 20 ? C.danger : C.muted }}>
            {fmtCurrency(calc.profit)} · {calc.profit_margin.toFixed(0)}%
          </div>
        </div>
        {showDuplicate && (
          <button style={{ ...s.secondaryBtn, padding: "5px 10px", fontSize: "0.78rem" }} onClick={e => { e.stopPropagation(); onDuplicate(); }}>
            Duplicate
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: "0.88rem" }}>{text}</div>;
}

function Section({ title, icon, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionIcon}>{icon}</span>
        <span style={s.sectionTitle}>{title}</span>
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}
function Row({ children }) { return <div style={s.row}>{children}</div>; }
function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = {
  // ── Login
  loginWrap: { minHeight: "100vh", background: "linear-gradient(135deg, #0d1f3c 0%, #1a4b8c 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 },
  loginCard: { background: "#ffffff", borderRadius: 20, padding: "40px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  loginIcon: { width: 64, height: 64, background: "#0d1f3c", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  loginTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0d1f3c", margin: "0 0 8px" },
  loginSub: { fontSize: "0.95rem", color: "#637592", margin: "0 0 32px" },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "16px 20px", background: "#ffffff", border: "1.5px solid #d4e1f5", borderRadius: 12, fontSize: "1rem", fontWeight: 600, color: "#2a3a52", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "'DM Sans', sans-serif" },
  loginFooter: { marginTop: 24, fontSize: "0.8rem", color: "#637592" },

  // ── App shell
  appWrap: { minHeight: "100vh", background: "#f0f5fc", fontFamily: "'DM Sans', sans-serif", color: "#2a3a52" },

  // ── Desktop header
  header: { background: "#ffffff", borderBottom: "1px solid #d4e1f5", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 12px rgba(13,31,60,0.07)", gap: 12 },

  // ── Mobile header
  mobileHeader: { background: "#ffffff", borderBottom: "1px solid #d4e1f5", padding: "0 16px", height: 56, display: "none", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(13,31,60,0.07)" },

  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerIcon: { width: 34, height: 34, background: "#0d1f3c", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0d1f3c" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#0d1f3c", color: "#f5a623", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: "1rem", flexShrink: 0 },
  logoutBtn: { background: "transparent", border: "1px solid #d4e1f5", borderRadius: 8, padding: "6px 12px", fontSize: "0.8rem", color: "#637592", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },

  // ── Desktop nav
  nav: { display: "flex", gap: 4, flexWrap: "nowrap", overflow: "hidden" },
  navBtn: { background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", fontWeight: 500, color: "#637592", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", whiteSpace: "nowrap" },
  navBtnActive: { background: "#f0f5fc", color: "#0d1f3c", fontWeight: 700 },

  // ── Mobile bottom tab bar
  bottomNav: { display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "#ffffff", borderTop: "1px solid #d4e1f5", paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -2px 16px rgba(13,31,60,0.08)" },
  bottomTab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", background: "transparent", border: "none", cursor: "pointer", color: "#637592", fontFamily: "'DM Sans', sans-serif", minHeight: 56 },
  bottomTabActive: { color: "#0d1f3c" },

  // ── More drawer
  moreDrawerOverlay: { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.35)" },
  moreDrawer: { position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom, 0px)" },
  moreDrawerItem: { display: "flex", alignItems: "center", width: "100%", padding: "16px 20px", background: "transparent", border: "none", borderBottom: "1px solid #f0f5fc", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" },

  // ── Main content
  main: { maxWidth: 900, margin: "0 auto", padding: "20px 16px 100px", display: "flex", flexDirection: "column", gap: 16 },

  // ── Total banner
  totalBanner: { background: "#0d1f3c", borderRadius: 16, padding: "20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, boxShadow: "0 8px 32px rgba(13,31,60,0.18)" },
  totalLabel: { fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  totalAmount: { fontFamily: "'DM Serif Display', serif", fontSize: "2.4rem", color: "#ffffff", lineHeight: 1 },
  pdfBtn: { background: "#f5a623", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,166,35,0.4)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  pdfBtnSuccess: { background: "#22c55e", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" },

  // ── Sections
  section: { background: "#ffffff", borderRadius: 16, border: "1px solid #d4e1f5", overflow: "hidden", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #d4e1f5", background: "#f0f5fc" },
  sectionIcon: { fontSize: "1rem" },
  sectionTitle: { fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "#0d1f3c" },
  sectionBody: { padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 },

  // ── Form layout
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 130 },
  label: { fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#637592" },

  // ── Inputs — 44px min touch target, 16px font prevents iOS zoom
  input: { padding: "12px 12px", border: "1.5px solid #d4e1f5", borderRadius: 10, fontSize: "16px", color: "#2a3a52", background: "#ffffff", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box", minHeight: 44, WebkitAppearance: "none" },
  fileLabel: { display: "block", padding: "12px 14px", border: "1.5px dashed #d4e1f5", borderRadius: 10, fontSize: "0.9rem", color: "#2e7dd1", cursor: "pointer", textAlign: "center", fontWeight: 500, background: "#f0f5fc", minHeight: 44 },
  textarea: { padding: "12px 14px", border: "1.5px solid #d4e1f5", borderRadius: 10, fontSize: "16px", color: "#2a3a52", background: "#ffffff", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box" },
  calcDisplay: { padding: "12px 14px", background: "#f0f5fc", border: "1.5px solid #d4e1f5", borderRadius: 10, fontSize: "1rem", fontWeight: 600, color: "#0d1f3c", minHeight: 44 },

  // ── Rough-in mobile card layout (replaces horizontal rows)
  roughCard: { background: "#f8fafd", border: "1px solid #d4e1f5", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 10 },
  roughCardHeader: { display: "flex", gap: 8, alignItems: "center" },
  roughFieldLabel: { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#637592", marginBottom: 4 },
  roughCardTotal: { fontSize: "0.88rem", color: "#637592", paddingTop: 4, borderTop: "1px solid #e8eef8" },
  roughDisclaimer: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 14px", fontSize: "0.8rem", color: "#92400e", lineHeight: 1.5 },
  roughHeader: { display: "none" }, // hidden — replaced by card layout
  roughRow: { display: "flex", gap: 8, alignItems: "center" }, // kept for compat
  roughTypeTag: { padding: "8px 10px", background: "#f0f5fc", border: "1.5px solid #d4e1f5", borderRadius: 9, fontSize: "0.82rem", fontWeight: 600, color: "#0d1f3c", whiteSpace: "nowrap" },

  // ── Fixture rows
  fixtureRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  fixtureLineTotal: { minWidth: 72, padding: "10px 0", fontWeight: 600, color: "#2e7dd1", fontSize: "0.9rem", textAlign: "right" },

  // ── Buttons — all 44px+ touch targets
  removeBtn: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", cursor: "pointer", padding: "8px 10px", fontSize: "0.82rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  addBtn: { background: "#f0f5fc", border: "1.5px dashed #d4e1f5", borderRadius: 10, color: "#2e7dd1", cursor: "pointer", padding: "12px 16px", fontSize: "0.9rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", alignSelf: "flex-start", minHeight: 44 },
  subtotalRow: { display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f0f5fc", borderRadius: 10, fontSize: "0.9rem", color: "#637592", marginTop: 4 },
  subtotalVal: { fontWeight: 700, color: "#0d1f3c" },

  // ── Summary card
  summaryCard: { background: "#ffffff", border: "1px solid #d4e1f5", borderRadius: 16, padding: "20px 18px", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  summaryTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "#0d1f3c", marginBottom: 16 },
  summaryLine: { display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#637592", padding: "9px 0", borderBottom: "1px solid #d4e1f5" },
  summaryDivider: { margin: "6px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "#0d1f3c", padding: "10px 0 16px" },
  pdfBtnFull: { display: "block", flex: 1, background: "#f5a623", color: "#0d1f3c", border: "none", borderRadius: 12, padding: "16px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,166,35,0.35)", fontFamily: "'DM Sans', sans-serif", textAlign: "center", minHeight: 52 },

  // ── Page layout
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  pageTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "#0d1f3c" },

  // ── Buttons
  primaryBtn: { background: "#0d1f3c", color: "#ffffff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", minHeight: 44 },
  secondaryBtn: { background: "#f0f5fc", color: "#0d1f3c", border: "1px solid #d4e1f5", borderRadius: 10, padding: "12px 16px", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", minHeight: 44 },
  dangerBtn: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", minHeight: 44 },
  filterBtn: { background: "#f0f5fc", color: "#637592", border: "1px solid #d4e1f5", borderRadius: 20, padding: "8px 14px", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", minHeight: 36 },
  filterBtnActive: { background: "#0d1f3c", color: "#ffffff", border: "1px solid #0d1f3c" },

  // ── List rows
  listRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: "1px solid #d4e1f5", background: "#ffffff", marginBottom: 4, flexWrap: "wrap" },
  listRowTitle: { fontWeight: 600, color: "#0d1f3c", fontSize: "0.95rem" },
  listRowMeta: { fontSize: "0.78rem", color: "#637592", marginTop: 2 },
  statusBadge: { padding: "4px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600, whiteSpace: "nowrap" },

  // ── Stat cards
  statCard: { background: "#ffffff", border: "1px solid #d4e1f5", borderRadius: 14, padding: "16px 16px", boxShadow: "0 2px 8px rgba(13,31,60,0.04)" },

  // ── Customer detail
  detailLine: { display: "flex", gap: 10, fontSize: "0.9rem", alignItems: "flex-start" },
  detailKey: { minWidth: 65, fontWeight: 600, color: "#637592", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 2, flexShrink: 0 },
};
