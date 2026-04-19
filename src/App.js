import { useState, useEffect, useMemo } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp
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
};

const JOB_TYPES = ["Drain Cleaning", "Fixture Install", "Pipe Repair", "Rough In"];

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

const newPipeRow = () => ({
  type: "PVC", size: "1/2\"",
  pricePerFt: PIPE_PRICING.PVC["1/2\""],
  length: 0,
});

const buildDefaultPipes = () => [
  { type: "PVC",    size: "1/2\"", pricePerFt: PIPE_PRICING.PVC["1/2\""],    length: 0 },
  { type: "ABS",    size: "1/2\"", pricePerFt: PIPE_PRICING.ABS["1/2\""],    length: 0 },
  { type: "Copper", size: "1/2\"", pricePerFt: PIPE_PRICING.Copper["1/2\""], length: 0 },
  { type: "PEX",    size: "1/2\"", pricePerFt: PIPE_PRICING.PEX["1/2\""],    length: 0 },
];

const buildDefaultFittings = () =>
  FITTING_KEYS.map(({ key, label }) => ({
    key, label,
    material:  "PVC",
    size:      "1/2\"",
    unitPrice: FITTING_PRICING.PVC[key]["1/2\""],
    qty:       0,
  }));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n) => "$" + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_QUOTE   = ["Draft", "Sent", "Approved", "Rejected"];
const STATUS_INVOICE = ["Draft", "Sent", "Paid"];

const STATUS_STYLE = {
  Draft:    { background: "#f0f5fc", color: "#637592",  border: "1px solid #d4e1f5" },
  Sent:     { background: "#eff6ff", color: "#2e7dd1",  border: "1px solid #bfdbfe" },
  Approved: { background: "#f0fdf4", color: "#16a34a",  border: "1px solid #bbf7d0" },
  Rejected: { background: "#fef2f2", color: "#dc2626",  border: "1px solid #fecaca" },
  Paid:     { background: "#f0fdf4", color: "#16a34a",  border: "1px solid #bbf7d0" },
  Invoice:  { background: "#fefce8", color: "#ca8a04",  border: "1px solid #fde68a" },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]       = useState(null);
  const [view, setView]       = useState("dashboard"); // dashboard | quote | customers | quotes | invoices
  const [editingQuote, setEditingQuote]     = useState(null); // quote doc or null
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customers, setCustomers]           = useState([]);
  const [quotes, setQuotes]                 = useState([]);
  const [invoices, setInvoices]             = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Firestore listeners — only when user is logged in
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
    return () => { unsubC(); unsubQ(); unsubI(); };
  }, [user]);

  const handleLogin  = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const openNewQuote = (prefilledCustomer = null) => {
    setEditingQuote({ _new: true, customer: prefilledCustomer });
    setView("quote");
  };

  const openQuote = (q) => {
    setEditingQuote(q);
    setView("quote");
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const navItems = [
    { id: "dashboard",  label: "Dashboard",  icon: "⬛" },
    { id: "quote",      label: "New Quote",  icon: "✚"  },
    { id: "quotes",     label: "Quotes",     icon: "📄" },
    { id: "invoices",   label: "Invoices",   icon: "🧾" },
    { id: "customers",  label: "Customers",  icon: "👤" },
  ];

  return (
    <div style={s.appWrap}>
      {/* ── HEADER ── */}
      <header style={s.header}>
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
          {navItems.map(n => (
            <button
              key={n.id}
              style={view === n.id || (n.id === "quote" && view === "quote")
                ? { ...s.navBtn, ...s.navBtnActive }
                : s.navBtn}
              onClick={() => {
                if (n.id === "quote") { setEditingQuote({ _new: true }); }
                setView(n.id);
              }}
            >
              <span style={{ marginRight: 5 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user.displayName?.[0] ?? "U"}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* ── VIEWS ── */}
      <main style={s.main}>
        {view === "dashboard" && (
          <DashboardView
            quotes={quotes}
            invoices={invoices}
            customers={customers}
            onOpenQuote={openQuote}
            onNewQuote={openNewQuote}
          />
        )}
        {view === "quote" && (
          <QuoteEditor
            user={user}
            quoteData={editingQuote}
            customers={customers}
            quotes={quotes}
            onSaved={(q) => { setEditingQuote(q); setView("quotes"); }}
            onConvertToInvoice={async (q) => {
              const inv = await convertToInvoice(q, user.uid);
              setView("invoices");
            }}
          />
        )}
        {view === "quotes" && (
          <QuotesListView
            quotes={quotes}
            customers={customers}
            onOpenQuote={openQuote}
            onNewQuote={() => { setEditingQuote({ _new: true }); setView("quote"); }}
            onDuplicate={async (q) => {
              const dup = await duplicateQuote(q, user.uid);
              openQuote(dup);
            }}
          />
        )}
        {view === "invoices" && (
          <InvoicesListView
            invoices={invoices}
            customers={customers}
            quotes={quotes}
            user={user}
          />
        )}
        {view === "customers" && (
          <CustomersView
            user={user}
            customers={customers}
            quotes={quotes}
            invoices={invoices}
            onNewQuote={openNewQuote}
            onOpenQuote={openQuote}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function saveQuote(quoteData, uid) {
  const payload = { ...quoteData, uid, updatedAt: serverTimestamp() };
  delete payload.id; delete payload._new;
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete payload.id;
  const ref = await addDoc(collection(db, "quotes"), payload);
  return { ...payload, id: ref.id };
}

async function convertToInvoice(q, uid) {
  const payload = {
    ...q,
    uid,
    quoteId: q.id,
    status: "Draft",
    invoiceType: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete payload.id; delete payload._new;
  const ref = await addDoc(collection(db, "invoices"), payload);
  return { ...payload, id: ref.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN (unchanged from original)
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
        <p style={s.loginFooter}>Used by 4,200+ plumbers across Canada</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function DashboardView({ quotes, invoices, customers, onOpenQuote, onNewQuote }) {
  const totalRevenue = invoices
    .filter(i => i.status === "Paid")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  const totalProfit = invoices
    .filter(i => i.status === "Paid")
    .reduce((s, i) => s + (Number(i.profit) || 0), 0);

  const pendingQuotes = quotes.filter(q => q.status === "Sent" || q.status === "Draft").length;
  const recentQuotes  = quotes.slice(0, 5);

  const stats = [
    { label: "Revenue (Paid)",  value: fmtCurrency(totalRevenue), color: C.green  },
    { label: "Total Profit",    value: fmtCurrency(totalProfit),  color: C.sky    },
    { label: "Total Jobs",      value: quotes.length + invoices.length, color: C.accent },
    { label: "Pending Quotes",  value: pendingQuotes,             color: C.muted  },
    { label: "Customers",       value: customers.length,          color: C.blue   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Dashboard</h2>
        <button style={s.primaryBtn} onClick={() => onNewQuote()}>+ New Quote</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
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
  const [exporting, setExporting]   = useState(false);

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

    const headers = ["Date","Customer","Job Name","Job Type","Subtotal","HST","Total","Profit","Status"];
    const csvRows = rows.map(q => [
      fmtDate(q.createdAt),
      custName(q.customerId) || q.clientName || "",
      q.jobName || "",
      q.jobType || "",
      (q.subtotal || 0).toFixed(2),
      (q.hst || 0).toFixed(2),
      (q.total || 0).toFixed(2),
      (q.profit || 0).toFixed(2),
      q.status || "Draft",
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "plumbquote-export.csv"; a.click();
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

      {/* Export date range */}
      <div style={{ ...s.section, padding: 0 }}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Export for Accountant</span>
        </div>
        <div style={{ ...s.sectionBody, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          <div style={s.field}>
            <label style={s.label}>From Date</label>
            <input type="date" style={s.input} value={exportRange.from} onChange={e => setExportRange(r => ({ ...r, from: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>To Date</label>
            <input type="date" style={s.input} value={exportRange.to} onChange={e => setExportRange(r => ({ ...r, to: e.target.value }))} />
          </div>
          <button style={s.primaryBtn} onClick={exportCSV}>Export All Quotes (CSV)</button>
        </div>
      </div>

      {/* Filters */}
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

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const name = (inv.jobName || "") + custName(inv);
      const matchSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || inv.status === filterStatus;
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

    const headers = ["Date","Paid Date","Customer","Job Name","Subtotal","HST","Total","Profit","Status"];
    const csvRows = rows.map(inv => [
      fmtDate(inv.createdAt),
      fmtDate(inv.paidAt),
      custName(inv),
      inv.jobName || "",
      (inv.subtotal || 0).toFixed(2),
      (inv.hst || 0).toFixed(2),
      (inv.total || 0).toFixed(2),
      (inv.profit || 0).toFixed(2),
      inv.status || "Draft",
    ]);
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

      {/* Export */}
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
          <button style={s.primaryBtn} onClick={exportCSV}>Export All Invoices (CSV)</button>
        </div>
      </div>

      {/* Filters */}
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
          {filtered.map(inv => (
            <div key={inv.id} style={s.listRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.listRowTitle}>{inv.jobName || "Untitled Job"}</div>
                <div style={s.listRowMeta}>{custName(inv)} · {fmtDate(inv.createdAt)}{inv.paidAt ? ` · Paid ${fmtDate(inv.paidAt)}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...s.statusBadge, ...(STATUS_STYLE[inv.status] || STATUS_STYLE.Draft) }}>{inv.status || "Draft"}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: C.navy }}>{fmtCurrency(inv.total)}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>profit {fmtCurrency(inv.profit)}</div>
                </div>
                {inv.status !== "Paid" && (
                  <button style={{ ...s.primaryBtn, padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => markPaid(inv)}>
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
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
  const [deleting, setDeleting]   = useState(false);

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
    setDeleting(true);
    try { await deleteDoc(doc(db, "customers", c.id)); setSelected(null); }
    finally { setDeleting(false); }
  };

  const custQuotes   = selected ? quotes.filter(q => q.customerId === selected.id) : [];
  const custInvoices = selected ? invoices.filter(i => i.customerId === selected.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Customers</h2>
        <button style={s.primaryBtn} onClick={openNew}>+ Add Customer</button>
      </div>

      {/* Add/Edit form */}
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
              <textarea style={s.textarea} placeholder="Any notes about this customer..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Customer"}</button>
              <button style={s.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Customer list */}
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

        {/* Customer detail */}
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
              </div>
            </div>

            {/* Customer quotes */}
            <div style={s.section}>
              <div style={s.sectionHeader}><span style={s.sectionTitle}>Quotes ({custQuotes.length})</span></div>
              <div style={s.sectionBody}>
                {custQuotes.length === 0 && <EmptyState text="No quotes for this customer." />}
                {custQuotes.map(q => <QuoteRow key={q.id} q={q} onClick={() => onOpenQuote(q)} />)}
              </div>
            </div>

            {/* Customer invoices */}
            {custInvoices.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionHeader}><span style={s.sectionTitle}>Invoices ({custInvoices.length})</span></div>
                <div style={s.sectionBody}>
                  {custInvoices.map(inv => (
                    <div key={inv.id} style={s.listRow}>
                      <div style={{ flex: 1 }}>
                        <div style={s.listRowTitle}>{inv.jobName || "Invoice"}</div>
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
// QUOTE EDITOR — full original calculator + new save/status/customer/invoice features
// ─────────────────────────────────────────────────────────────────────────────

function QuoteEditor({ user, quoteData, customers, quotes, onSaved, onConvertToInvoice }) {
  // ── Meta fields (new)
  const [jobName,     setJobName]     = useState(quoteData?.jobName     || "");
  const [customerId,  setCustomerId]  = useState(quoteData?.customerId  || "");
  const [status,      setStatus]      = useState(quoteData?.status      || "Draft");
  const [saving,      setSaving]      = useState(false);
  const [pdfSuccess,  setPdfSuccess]  = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Original fields (unchanged)
  const [companyName, setCompanyName] = useState(quoteData?.companyName || "Plumb Quote 3");
  const [clientName,  setClientName]  = useState(quoteData?.clientName  || (quoteData?.customer?.name || ""));
  const [jobType,     setJobType]     = useState(quoteData?.jobType     || "Drain Cleaning");
  const [hours,       setHours]       = useState(quoteData?.hours       ?? 1);
  const [hourlyRate,  setHourlyRate]  = useState(quoteData?.hourlyRate  ?? 120);
  const [materialCost,setMaterialCost]= useState(quoteData?.materialCost ?? 0);
  const [markup,      setMarkup]      = useState(quoteData?.markup       ?? 1.4);
  const [materialsList,setMaterialsList]=useState(quoteData?.materialsList || "");
  const [logo,        setLogo]        = useState(quoteData?.logo        || null);
  const [fixtures,    setFixtures]    = useState(quoteData?.fixtures    || [{ name: "", labour: 0, qty: 1 }]);
  const [pipes,       setPipes]       = useState(quoteData?.pipes       || buildDefaultPipes());
  const [fittings,    setFittings]    = useState(quoteData?.fittings    || buildDefaultFittings());
  const [roughLabour, setRoughLabour] = useState(quoteData?.roughLabour ?? 0);

  // Pre-fill client name from selected customer
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
      if (PIPE_PRICING[t]?.[sz] !== undefined) u[i].pricePerFt = PIPE_PRICING[t][sz];
    }
    setPipes(u);
  };
  const updateFitting = (i, field, value) => {
    const u = [...fittings]; u[i][field] = value;
    if (field === "material" || field === "size") {
      const mat = field === "material" ? value : u[i].material;
      const sz  = field === "size"     ? value : u[i].size;
      const fp  = FITTING_PRICING[mat]?.[u[i].key]?.[sz];
      if (fp !== undefined) u[i].unitPrice = fp;
    }
    setFittings(u);
  };

  // ── Calculations (unchanged)
  const laborCost     = hourlyRate * hours;
  const materials     = materialCost * markup;
  const fixtureTotal  = fixtures.reduce((s, f) => s + Number(f.labour) * Number(f.qty), 0);
  const pipesTotal    = pipes.reduce((s, p) => s + Number(p.length) * Number(p.pricePerFt), 0);
  const fittingsTotal = fittings.reduce((s, f) => s + Number(f.qty) * Number(f.unitPrice), 0);
  const roughInTotal  = pipesTotal + fittingsTotal + Number(roughLabour);

  const subtotal =
    jobType === "Fixture Install" ? fixtureTotal + materials
    : jobType === "Rough In"     ? roughInTotal
    : laborCost + materials;

  const HST_RATE = 0.13;
  const hst      = subtotal * HST_RATE;
  const total    = subtotal + hst;

  // Profit = revenue - cost (cost = materials at cost, not marked up, + labour)
  const costBase =
    jobType === "Rough In"      ? roughInTotal
    : jobType === "Fixture Install" ? fixtureTotal + materialCost
    : laborCost + materialCost;
  const profit   = total - costBase;
  const profitPct = costBase > 0 ? ((profit / total) * 100).toFixed(1) : "0.0";

  // ── Save to Firestore
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(quoteData?.id ? { id: quoteData.id } : {}),
        jobName, customerId, status, companyName, clientName, jobType,
        hours, hourlyRate, materialCost, markup, materialsList, logo,
        fixtures, pipes, fittings, roughLabour,
        subtotal, hst, total, profit: Number(profit.toFixed(2)),
        pipesTotal, fittingsTotal, roughInTotal,
      };
      const saved = await saveQuote(payload, user.uid);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onSaved(saved);
    } finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (!quoteData?.id) { alert("Save the quote first."); return; }
    await onConvertToInvoice({ ...quoteData, jobName, customerId, status, subtotal, hst, total, profit });
  };

  // ── PDF (original, unchanged — just passes through)
  const generatePDF = () => {
    const doc  = new jsPDF();
    const pageW = 210;
    const L = 15, R = pageW - 15;

    if (logo) doc.addImage(logo, "PNG", R - 40, 10, 40, 20);
    doc.setFontSize(22); doc.setTextColor(13, 31, 60);
    doc.text(companyName, L, 22);
    doc.setFontSize(10); doc.setTextColor(99, 117, 146);
    doc.text("Client: " + (clientName || "\u2014"), L, 32);
    doc.text("Job: " + (jobName || jobType), L, 39);
    doc.text("Date: " + new Date().toLocaleDateString("en-CA"), L, 46);
    doc.setDrawColor(212, 225, 245); doc.setLineWidth(0.5);
    doc.line(L, 51, R, 51);

    let y = 60;

    const sectionHeader = (title) => {
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(L, y - 5, R - L, 10, 2, 2, "F");
      doc.setFontSize(11); doc.setTextColor(13, 31, 60); doc.setFont(undefined, "bold");
      doc.text(title, L + 3, y + 2); doc.setFont(undefined, "normal"); y += 12;
    };
    const colHeader = (cols) => {
      doc.setFontSize(8); doc.setTextColor(99, 117, 146);
      cols.forEach(([txt, x, align]) => {
        if (align === "right") { const w = doc.getTextWidth(txt); doc.text(txt, x - w, y); }
        else doc.text(txt, x, y);
      });
      y += 4; doc.setDrawColor(212, 225, 245); doc.setLineWidth(0.3);
      doc.line(L, y, R, y); y += 6;
    };
    const dataRow = (cols, shade) => {
      if (shade) { doc.setFillColor(248, 251, 255); doc.rect(L, y - 5, R - L, 8, "F"); }
      doc.setFontSize(9); doc.setTextColor(42, 58, 82);
      cols.forEach(([txt, x, align]) => {
        if (align === "right") { const w = doc.getTextWidth(String(txt)); doc.text(String(txt), x - w, y); }
        else doc.text(String(txt), x, y);
      });
      y += 9;
    };
    const subtotalLine = (label, val) => {
      doc.setFontSize(9); doc.setTextColor(99, 117, 146);
      doc.text(label, 130, y);
      doc.setTextColor(13, 31, 60); doc.setFont(undefined, "bold");
      const w = doc.getTextWidth("$" + val);
      doc.text("$" + val, R - w, y); doc.setFont(undefined, "normal"); y += 8;
    };

    if (jobType === "Rough In") {
      sectionHeader("Rough-In Piping");
      colHeader([["Pipe Type", L + 2, "left"], ["Size", 62, "left"], ["Length", 95, "left"], ["$/ft", 128, "left"], ["Cost", R, "right"]]);
      const activePipes = pipes.filter(p => Number(p.length) > 0);
      if (activePipes.length === 0) { doc.setFontSize(9); doc.setTextColor(99, 117, 146); doc.text("No piping entered.", L + 2, y); y += 9; }
      else activePipes.forEach((p, idx) => {
        dataRow([[p.type, L + 2, "left"], [p.size, 62, "left"], [p.length + " ft", 95, "left"], ["$" + Number(p.pricePerFt).toFixed(2), 128, "left"], ["$" + (Number(p.length) * Number(p.pricePerFt)).toFixed(2), R, "right"]], idx % 2 === 0);
      });
      subtotalLine("Piping Subtotal", pipesTotal.toFixed(2)); y += 4;

      sectionHeader("Rough-In Fittings");
      colHeader([["Fitting", L + 2, "left"], ["Material", 55, "left"], ["Size", 85, "left"], ["Qty", 112, "left"], ["Unit", 135, "left"], ["Total", R, "right"]]);
      const activeFittings = fittings.filter(f => Number(f.qty) > 0);
      if (activeFittings.length === 0) { doc.setFontSize(9); doc.setTextColor(99, 117, 146); doc.text("No fittings entered.", L + 2, y); y += 9; }
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
      dataRow([["Materials", L + 2, "left"], ["$" + materials.toFixed(2), R, "right"]], true); y += 4;
    }

    doc.setDrawColor(212, 225, 245); doc.setLineWidth(0.5); doc.line(L, y, R, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(99, 117, 146);
    doc.text("Subtotal", 130, y);
    const sw = doc.getTextWidth("$" + subtotal.toFixed(2));
    doc.setTextColor(42, 58, 82); doc.text("$" + subtotal.toFixed(2), R - sw, y); y += 8;
    doc.setTextColor(99, 117, 146); doc.text("HST (13%)", 130, y);
    const hw = doc.getTextWidth("$" + hst.toFixed(2));
    doc.setTextColor(42, 58, 82); doc.text("$" + hst.toFixed(2), R - hw, y); y += 5;
    doc.setDrawColor(13, 31, 60); doc.setLineWidth(0.7); doc.line(130, y, R, y); y += 8;
    doc.setFontSize(13); doc.setTextColor(13, 31, 60); doc.setFont(undefined, "bold");
    doc.text("TOTAL", 130, y);
    const tw = doc.getTextWidth("$" + total.toFixed(2));
    doc.text("$" + total.toFixed(2), R - tw, y); doc.setFont(undefined, "normal");
    if (jobType !== "Rough In" && materialsList) {
      y += 16; doc.setFontSize(9); doc.setTextColor(99, 117, 146);
      doc.text("Materials Used:", L, y); y += 6;
      doc.setTextColor(42, 58, 82); doc.text(materialsList, L, y);
    }
    doc.setFontSize(8); doc.setTextColor(180, 195, 215);
    doc.text("Generated by PlumbQuote 3  \u2022  Prices are estimates only. Verify before submitting.", L, 285);
    doc.save((clientName || jobName || "quote") + ".pdf");
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── TOTAL BANNER (original) */}
      <div style={s.totalBanner}>
        <div>
          <div style={s.totalLabel}>Estimated Total</div>
          <div style={s.totalAmount}>${total.toFixed(2)}</div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>incl. HST (13%)</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Profit badge */}
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>PROFIT</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: profit >= 0 ? "#4ade80" : "#f87171" }}>
              {fmtCurrency(profit)} <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>({profitPct}%)</span>
            </div>
          </div>
          <button style={pdfSuccess ? { ...s.pdfBtn, ...s.pdfBtnSuccess } : s.pdfBtn} onClick={generatePDF}>
            {pdfSuccess ? "✓ Downloaded!" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* ── NEW: Quote meta bar */}
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={saveSuccess ? { ...s.primaryBtn, background: C.green } : s.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "💾 Save Quote"}
            </button>
            {quoteData?.id && (
              <button style={s.secondaryBtn} onClick={handleConvert}>
                🧾 Convert to Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── JOB DETAILS (original) */}
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

      {/* ── ROUGH-IN (original, unchanged) */}
      {jobType === "Rough In" && (
        <>
          <Section title="Rough-In — Piping" icon="🔩">
            <div style={s.roughDisclaimer}>
              ⚠ Prices auto-fill from Ontario supply baselines (Home Depot CA, Wolseley, Noble Trade). All values are editable — adjust to your actual costs before submitting.
            </div>
            <div style={s.roughHeader}>
              <span style={{ flex: "0 0 90px" }}>Type</span>
              <span style={{ flex: "0 0 88px" }}>Size</span>
              <span style={{ flex: 1 }}>Length (ft)</span>
              <span style={{ flex: 1 }}>$/ft</span>
              <span style={{ flex: "0 0 78px", textAlign: "right" }}>Cost</span>
              <span style={{ flex: "0 0 32px" }}></span>
            </div>
            {pipes.map((p, i) => (
              <div key={i} style={s.roughRow}>
                <select style={{ ...s.input, flex: "0 0 90px" }} value={p.type} onChange={(e) => updatePipe(i, "type", e.target.value)}>
                  {Object.keys(PIPE_PRICING).map(t => <option key={t}>{t}</option>)}
                </select>
                <select style={{ ...s.input, flex: "0 0 88px" }} value={p.size} onChange={(e) => updatePipe(i, "size", e.target.value)}>
                  {PIPE_SIZES.map(sz => <option key={sz}>{sz}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1 }} type="number" min="0" placeholder="0" value={p.length || ""} onChange={(e) => updatePipe(i, "length", e.target.value)} />
                <input style={{ ...s.input, flex: 1 }} type="number" min="0" step="0.01" value={p.pricePerFt} onChange={(e) => updatePipe(i, "pricePerFt", e.target.value)} />
                <div style={{ ...s.fixtureLineTotal, flex: "0 0 78px" }}>${(Number(p.length) * Number(p.pricePerFt)).toFixed(2)}</div>
                <button style={{ ...s.removeBtn, flex: "0 0 32px", opacity: pipes.length === 1 ? 0.3 : 1 }} onClick={() => removePipeRow(i)} disabled={pipes.length === 1}>✕</button>
              </div>
            ))}
            <button style={s.addBtn} onClick={addPipeRow}>+ Add Pipe</button>
            <div style={s.subtotalRow}><span>Piping Subtotal</span><span style={s.subtotalVal}>${pipesTotal.toFixed(2)}</span></div>
          </Section>

          <Section title="Rough-In — Fittings" icon="🔧">
            <div style={s.roughDisclaimer}>
              ⚠ Unit prices reflect material type — Copper fittings are significantly higher than PVC/ABS. Prices auto-update when material or size changes.
            </div>
            <div style={s.roughHeader}>
              <span style={{ flex: "0 0 95px" }}>Fitting</span>
              <span style={{ flex: "0 0 82px" }}>Material</span>
              <span style={{ flex: "0 0 78px" }}>Size</span>
              <span style={{ flex: "0 0 58px" }}>Qty</span>
              <span style={{ flex: 1 }}>Unit Price ($)</span>
              <span style={{ flex: "0 0 75px", textAlign: "right" }}>Total</span>
            </div>
            {fittings.map((f, i) => (
              <div key={i} style={s.roughRow}>
                <div style={{ ...s.roughTypeTag, flex: "0 0 95px", fontSize: "0.82rem" }}>{f.label}</div>
                <select style={{ ...s.input, flex: "0 0 82px" }} value={f.material} onChange={(e) => updateFitting(i, "material", e.target.value)}>
                  {Object.keys(FITTING_PRICING).map(m => <option key={m}>{m}</option>)}
                </select>
                <select style={{ ...s.input, flex: "0 0 78px" }} value={f.size} onChange={(e) => updateFitting(i, "size", e.target.value)}>
                  {FITTING_SIZES.map(sz => <option key={sz}>{sz}</option>)}
                </select>
                <input style={{ ...s.input, flex: "0 0 58px" }} type="number" min="0" placeholder="0" value={f.qty || ""} onChange={(e) => updateFitting(i, "qty", e.target.value)} />
                <input style={{ ...s.input, flex: 1 }} type="number" min="0" step="0.01" value={f.unitPrice} onChange={(e) => updateFitting(i, "unitPrice", e.target.value)} />
                <div style={{ ...s.fixtureLineTotal, flex: "0 0 75px" }}>${(Number(f.qty) * Number(f.unitPrice)).toFixed(2)}</div>
              </div>
            ))}
            <div style={s.subtotalRow}><span>Fittings Subtotal</span><span style={s.subtotalVal}>${fittingsTotal.toFixed(2)}</span></div>
          </Section>

          <Section title="Rough-In — Labour" icon="👷">
            <Row>
              <Field label="Labour Cost ($)">
                <input style={s.input} type="number" min="0" placeholder="0.00" value={roughLabour || ""} onChange={(e) => setRoughLabour(e.target.value)} />
              </Field>
              <Field label="Total Rough-In Cost">
                <div style={s.calcDisplay}>${roughInTotal.toFixed(2)}</div>
              </Field>
            </Row>
          </Section>
        </>
      )}

      {/* ── LABOUR (original, unchanged) */}
      {jobType !== "Rough In" && (
        <Section title="Labour" icon="🔧">
          {jobType === "Fixture Install" ? (
            <>
              {fixtures.map((f, i) => (
                <div key={i} style={s.fixtureRow}>
                  <input style={{ ...s.input, flex: 2 }} placeholder="Fixture name (e.g. Toilet)" value={f.name} onChange={(e) => updateFixture(i, "name", e.target.value)} />
                  <input style={{ ...s.input, flex: 1 }} type="number" placeholder="Labour $" value={f.labour} onChange={(e) => updateFixture(i, "labour", e.target.value)} />
                  <input style={{ ...s.input, width: 70, flex: "none" }} type="number" placeholder="Qty" value={f.qty} onChange={(e) => updateFixture(i, "qty", e.target.value)} />
                  <div style={s.fixtureLineTotal}>${(Number(f.labour) * Number(f.qty)).toFixed(2)}</div>
                  {fixtures.length > 1 && <button style={s.removeBtn} onClick={() => removeFixture(i)}>✕</button>}
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

      {/* ── MATERIALS (original, unchanged) */}
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

      {/* ── SUMMARY (original + profit row) */}
      <div style={s.summaryCard}>
        <div style={s.summaryTitle}>Quote Summary</div>
        {jobType === "Rough In" ? (
          <>
            <div style={s.summaryLine}><span>Piping</span><span>${pipesTotal.toFixed(2)}</span></div>
            <div style={s.summaryLine}><span>Fittings</span><span>${fittingsTotal.toFixed(2)}</span></div>
            <div style={s.summaryLine}><span>Labour</span><span>${Number(roughLabour).toFixed(2)}</span></div>
          </>
        ) : (
          <>
            <div style={s.summaryLine}>
              <span>{jobType === "Fixture Install" ? "Fixture Labour" : "Labour"}</span>
              <span>${(jobType === "Fixture Install" ? fixtureTotal : laborCost).toFixed(2)}</span>
            </div>
            <div style={s.summaryLine}><span>Materials (incl. markup)</span><span>${materials.toFixed(2)}</span></div>
          </>
        )}
        <div style={s.summaryLine}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div style={{ ...s.summaryLine, color: C.sky }}><span>HST (13%)</span><span>${hst.toFixed(2)}</span></div>
        <div style={s.summaryDivider} />
        <div style={s.summaryTotal}><span>Total</span><span>${total.toFixed(2)}</span></div>
        <div style={{ ...s.summaryLine, borderBottom: "none", color: profit >= 0 ? C.green : C.danger, fontWeight: 600 }}>
          <span>Profit</span>
          <span>{fmtCurrency(profit)} ({profitPct}%)</span>
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
  return (
    <div style={{ ...s.listRow, cursor: "pointer" }} onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.listRowTitle}>{q.jobName || q.jobType || "Untitled"}</div>
        <div style={s.listRowMeta}>{custName || q.clientName || "—"} · {fmtDate(q.createdAt)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ ...s.statusBadge, ...(STATUS_STYLE[q.status] || STATUS_STYLE.Draft) }}>{q.status || "Draft"}</span>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.95rem" }}>{fmtCurrency(q.total)}</div>
          {q.profit != null && <div style={{ fontSize: "0.73rem", color: C.muted }}>profit {fmtCurrency(q.profit)}</div>}
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
// STYLES — all original styles preserved + new ones appended
// ─────────────────────────────────────────────────────────────────────────────

const s = {
  // ── Original styles (unchanged) ──────────────────────────────────────────
  loginWrap: { minHeight: "100vh", background: "linear-gradient(135deg, #0d1f3c 0%, #1a4b8c 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 },
  loginCard: { background: "#ffffff", borderRadius: 20, padding: "48px 40px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  loginIcon: { width: 64, height: 64, background: "#0d1f3c", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  loginTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0d1f3c", margin: "0 0 8px" },
  loginSub: { fontSize: "0.95rem", color: "#637592", margin: "0 0 32px" },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "14px 20px", background: "#ffffff", border: "1.5px solid #d4e1f5", borderRadius: 10, fontSize: "0.95rem", fontWeight: 600, color: "#2a3a52", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "'DM Sans', sans-serif" },
  loginFooter: { marginTop: 24, fontSize: "0.8rem", color: "#637592" },
  appWrap: { minHeight: "100vh", background: "#f0f5fc", fontFamily: "'DM Sans', sans-serif", color: "#2a3a52" },
  header: { background: "#ffffff", borderBottom: "1px solid #d4e1f5", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 12px rgba(13,31,60,0.07)", gap: 12, flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerIcon: { width: 36, height: 36, background: "#0d1f3c", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0d1f3c" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#0d1f3c", color: "#f5a623", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: "1rem" },
  logoutBtn: { background: "transparent", border: "1px solid #d4e1f5", borderRadius: 8, padding: "6px 14px", fontSize: "0.82rem", color: "#637592", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  main: { maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px", display: "flex", flexDirection: "column", gap: 20 },
  totalBanner: { background: "#0d1f3c", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, boxShadow: "0 8px 32px rgba(13,31,60,0.18)" },
  totalLabel: { fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  totalAmount: { fontFamily: "'DM Serif Display', serif", fontSize: "2.6rem", color: "#ffffff", lineHeight: 1 },
  pdfBtn: { background: "#f5a623", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "13px 24px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,166,35,0.4)", fontFamily: "'DM Sans', sans-serif" },
  pdfBtnSuccess: { background: "#22c55e", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" },
  section: { background: "#ffffff", borderRadius: 16, border: "1px solid #d4e1f5", overflow: "hidden", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", borderBottom: "1px solid #d4e1f5", background: "#f0f5fc" },
  sectionIcon: { fontSize: "1rem" },
  sectionTitle: { fontWeight: 600, fontSize: "0.88rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "#0d1f3c" },
  sectionBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 },
  label: { fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#637592" },
  input: { padding: "10px 12px", border: "1.5px solid #d4e1f5", borderRadius: 9, fontSize: "0.9rem", color: "#2a3a52", background: "#ffffff", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  fileLabel: { display: "block", padding: "10px 14px", border: "1.5px dashed #d4e1f5", borderRadius: 9, fontSize: "0.9rem", color: "#2e7dd1", cursor: "pointer", textAlign: "center", fontWeight: 500, background: "#f0f5fc" },
  textarea: { padding: "10px 14px", border: "1.5px solid #d4e1f5", borderRadius: 9, fontSize: "0.9rem", color: "#2a3a52", background: "#ffffff", outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box" },
  calcDisplay: { padding: "10px 14px", background: "#f0f5fc", border: "1.5px solid #d4e1f5", borderRadius: 9, fontSize: "1rem", fontWeight: 600, color: "#0d1f3c" },
  fixtureRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  fixtureLineTotal: { minWidth: 72, padding: "10px 0", fontWeight: 600, color: "#2e7dd1", fontSize: "0.9rem", textAlign: "right" },
  removeBtn: { background: "transparent", border: "1px solid #d4e1f5", borderRadius: 6, color: "#637592", cursor: "pointer", padding: "6px 9px", fontSize: "0.78rem", lineHeight: 1 },
  addBtn: { background: "#f0f5fc", border: "1.5px dashed #d4e1f5", borderRadius: 9, color: "#2e7dd1", cursor: "pointer", padding: "10px 16px", fontSize: "0.88rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", alignSelf: "flex-start" },
  subtotalRow: { display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f0f5fc", borderRadius: 9, fontSize: "0.9rem", color: "#637592", marginTop: 4 },
  subtotalVal: { fontWeight: 600, color: "#0d1f3c" },
  roughDisclaimer: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "10px 14px", fontSize: "0.8rem", color: "#92400e", lineHeight: 1.5 },
  roughHeader: { display: "flex", gap: 8, alignItems: "center", padding: "0 2px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#637592" },
  roughRow: { display: "flex", gap: 8, alignItems: "center" },
  roughTypeTag: { padding: "10px 10px", background: "#f0f5fc", border: "1.5px solid #d4e1f5", borderRadius: 9, fontSize: "0.85rem", fontWeight: 600, color: "#0d1f3c", whiteSpace: "nowrap" },
  summaryCard: { background: "#ffffff", border: "1px solid #d4e1f5", borderRadius: 16, padding: "24px", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  summaryTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "#0d1f3c", marginBottom: 16 },
  summaryLine: { display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#637592", padding: "8px 0", borderBottom: "1px solid #d4e1f5" },
  summaryDivider: { margin: "8px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "#0d1f3c", padding: "10px 0 20px" },
  pdfBtnFull: { display: "block", flex: 1, background: "#f5a623", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "14px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,166,35,0.35)", fontFamily: "'DM Sans', sans-serif", textAlign: "center" },

  // ── New styles ───────────────────────────────────────────────────────────
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
  navBtn: { background: "transparent", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: "0.85rem", fontWeight: 500, color: "#637592", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", whiteSpace: "nowrap" },
  navBtnActive: { background: "#f0f5fc", color: "#0d1f3c", fontWeight: 700 },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  pageTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0d1f3c" },
  primaryBtn: { background: "#0d1f3c", color: "#ffffff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  secondaryBtn: { background: "#f0f5fc", color: "#0d1f3c", border: "1px solid #d4e1f5", borderRadius: 9, padding: "10px 16px", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  dangerBtn: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 16px", fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  filterBtn: { background: "#f0f5fc", color: "#637592", border: "1px solid #d4e1f5", borderRadius: 20, padding: "6px 14px", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  filterBtnActive: { background: "#0d1f3c", color: "#ffffff", border: "1px solid #0d1f3c" },
  listRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, border: "1px solid #d4e1f5", background: "#ffffff", marginBottom: 2, flexWrap: "wrap" },
  listRowTitle: { fontWeight: 600, color: "#0d1f3c", fontSize: "0.95rem" },
  listRowMeta: { fontSize: "0.78rem", color: "#637592", marginTop: 2 },
  statusBadge: { padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" },
  statCard: { background: "#ffffff", border: "1px solid #d4e1f5", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(13,31,60,0.04)" },
  detailLine: { display: "flex", gap: 12, fontSize: "0.9rem", alignItems: "flex-start" },
  detailKey: { minWidth: 70, fontWeight: 600, color: "#637592", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 1 },
};
