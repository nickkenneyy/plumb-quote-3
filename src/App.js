import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { jsPDF } from "jspdf";

// ── Google Font import (add to your index.html <head>)
// <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">

const C = {
  navy:    "#0d1f3c",
  blue:    "#1a4b8c",
  sky:     "#2e7dd1",
  accent:  "#f5a623",
  light:   "#f0f5fc",
  white:   "#ffffff",
  text:    "#2a3a52",
  muted:   "#637592",
  border:  "#d4e1f5",
  danger:  "#e53e3e",
};

const JOB_TYPES = ["Drain Cleaning", "Fixture Install", "Pipe Repair"];

export default function App() {
  const [user, setUser]               = useState(null);
  const [companyName, setCompanyName] = useState("Plumb Quote 3");
  const [clientName, setClientName]   = useState("");
  const [jobType, setJobType]         = useState("Drain Cleaning");
  const [hours, setHours]             = useState(1);
  const [hourlyRate, setHourlyRate]   = useState(120);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup]           = useState(1.4);
  const [materialsList, setMaterialsList] = useState("");
  const [logo, setLogo]               = useState(null);
  const [fixtures, setFixtures]       = useState([{ name: "", labour: 0, qty: 1 }]);
  const [pdfSuccess, setPdfSuccess]   = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogin  = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const addFixture = () => setFixtures([...fixtures, { name: "", labour: 0, qty: 1 }]);
  const removeFixture = (i) => setFixtures(fixtures.filter((_, idx) => idx !== i));
  const updateFixture = (i, field, value) => {
    const updated = [...fixtures];
    updated[i][field] = value;
    setFixtures(updated);
  };

  const handleLogoUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(e.target.files[0]);
  };

  const laborCost    = hourlyRate * hours;
  const materials    = materialCost * markup;
  const fixtureTotal = fixtures.reduce((s, f) => s + Number(f.labour) * Number(f.qty), 0);
  const subtotal     = jobType === "Fixture Install" ? fixtureTotal + materials : laborCost + materials;
  const HST_RATE     = 0.13;
  const hst          = subtotal * HST_RATE;
  const total        = subtotal + hst;

  const generatePDF = () => {
    const doc = new jsPDF();
    if (logo) doc.addImage(logo, "PNG", 150, 10, 40, 20);
    doc.setFontSize(20);
    doc.text(companyName, 20, 20);
    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 35);
    doc.text(`Job Type: ${jobType}`, 20, 45);
    doc.line(20, 50, 190, 50);
    let y = 65;
    if (jobType === "Fixture Install") {
      fixtures.forEach((f) => {
        if (f.name && f.labour > 0) {
          doc.text(`${f.name} install labour x${f.qty}`, 20, y);
          doc.text(`$${(Number(f.labour) * Number(f.qty)).toFixed(2)}`, 150, y);
          y += 10;
        }
      });
    } else {
      doc.text("Labor", 20, y);
      doc.text(`$${laborCost.toFixed(2)}`, 150, y);
      y += 10;
    }
    doc.text("Materials", 20, y);
    doc.text(`$${materials.toFixed(2)}`, 150, y);
    y += 15;
    doc.setFontSize(12);
    doc.text("Subtotal", 20, y);
    doc.text(`$${subtotal.toFixed(2)}`, 150, y);
    y += 10;
    doc.text("HST (13%)", 20, y);
    doc.text(`$${hst.toFixed(2)}`, 150, y);
    y += 10;
    doc.setFontSize(14);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, y);
    doc.setFontSize(10);
    doc.text("Materials Used:", 20, y + 15);
    doc.text(materialsList || "N/A", 20, y + 25);
    doc.save(`${clientName || "quote"}.pdf`);
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  // ─── LOGIN SCREEN ──────────────────────────────────────────────
  if (!user) {
    return (
      <div style={s.loginWrap}>
        <div style={s.loginCard}>
          <div style={s.loginIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 2 8 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" opacity=".3" fill="white"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <h1 style={s.loginTitle}>Plumb<span style={{color: C.sky}}>Quote</span> 3</h1>
          <p style={s.loginSub}>Professional plumbing estimates in 30 seconds</p>
          <button style={s.googleBtn} onClick={handleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight: 10, flexShrink: 0}}>
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

  // ─── MAIN APP ──────────────────────────────────────────────────
  return (
    <div style={s.appWrap}>

      {/* ── HEADER */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 2 8 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" opacity=".3" fill="white"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
          </div>
          <span style={s.headerTitle}>Plumb<span style={{color: C.sky}}>Quote</span> 3</span>
        </div>
        <div style={s.headerRight}>
          <div style={s.avatar}>{user.displayName?.[0] ?? "U"}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* ── BODY */}
      <main style={s.main}>

        {/* TOTAL HERO BANNER */}
        <div style={s.totalBanner}>
          <div>
            <div style={s.totalLabel}>Estimated Total</div>
            <div style={s.totalAmount}>${total.toFixed(2)}</div>
          <div style={{fontSize:"0.75rem", color:"rgba(255,255,255,0.45)", marginTop:4}}>incl. HST (13%)</div>
          </div>
          <button
            style={pdfSuccess ? {...s.pdfBtn, ...s.pdfBtnSuccess} : s.pdfBtn}
            onClick={generatePDF}
          >
            {pdfSuccess ? "✓ Downloaded!" : "⬇ Download PDF"}
          </button>
        </div>

        {/* ── SECTION: Company & Client */}
        <Section title="Job Details" icon="📋">
          <Row>
            <Field label="Company Name">
              <input
                style={s.input}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </Field>
            <Field label="Client Name">
              <input
                style={s.input}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client full name"
              />
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
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:"none"}} />
              </label>
            </Field>
          </Row>
        </Section>

        {/* ── SECTION: Labour */}
        <Section title="Labour" icon="🔧">
          {jobType === "Fixture Install" ? (
            <>
              {fixtures.map((f, i) => (
                <div key={i} style={s.fixtureRow}>
                  <input
                    style={{...s.input, flex: 2}}
                    placeholder="Fixture name (e.g. Toilet)"
                    value={f.name}
                    onChange={(e) => updateFixture(i, "name", e.target.value)}
                  />
                  <input
                    style={{...s.input, flex: 1}}
                    type="number"
                    placeholder="Labour $"
                    value={f.labour}
                    onChange={(e) => updateFixture(i, "labour", e.target.value)}
                  />
                  <input
                    style={{...s.input, width: 70, flex: "none"}}
                    type="number"
                    placeholder="Qty"
                    value={f.qty}
                    onChange={(e) => updateFixture(i, "qty", e.target.value)}
                  />
                  <div style={s.fixtureLineTotal}>
                    ${(Number(f.labour) * Number(f.qty)).toFixed(2)}
                  </div>
                  {fixtures.length > 1 && (
                    <button style={s.removeBtn} onClick={() => removeFixture(i)}>✕</button>
                  )}
                </div>
              ))}
              <button style={s.addBtn} onClick={addFixture}>+ Add Fixture</button>
              <div style={s.subtotalRow}>
                <span>Fixture Labour Subtotal</span>
                <span style={s.subtotalVal}>${fixtureTotal.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <Row>
              <Field label="Hourly Rate ($)">
                <input
                  style={s.input}
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                />
              </Field>
              <Field label="Hours">
                <input
                  style={s.input}
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </Field>
              <Field label="Labour Cost">
                <div style={s.calcDisplay}>${laborCost.toFixed(2)}</div>
              </Field>
            </Row>
          )}
        </Section>

        {/* ── SECTION: Materials */}
        <Section title="Materials" icon="🪛">
          <Row>
            <Field label="Material Cost ($)">
              <input
                style={s.input}
                type="number"
                value={materialCost}
                onChange={(e) => setMaterialCost(Number(e.target.value))}
              />
            </Field>
            <Field label="Markup Multiplier">
              <input
                style={s.input}
                type="number"
                step="0.05"
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
              />
            </Field>
            <Field label="Marked Up Total">
              <div style={s.calcDisplay}>${materials.toFixed(2)}</div>
            </Field>
          </Row>
          <Field label="Materials List (for PDF)">
            <textarea
              style={s.textarea}
              placeholder="e.g. 10m copper pipe, 2x ball valves, solder..."
              value={materialsList}
              onChange={(e) => setMaterialsList(e.target.value)}
            />
          </Field>
        </Section>

        {/* ── SUMMARY */}
        <div style={s.summaryCard}>
          <div style={s.summaryTitle}>Quote Summary</div>
          <div style={s.summaryLine}>
            <span>{jobType === "Fixture Install" ? "Fixture Labour" : "Labour"}</span>
            <span>${(jobType === "Fixture Install" ? fixtureTotal : laborCost).toFixed(2)}</span>
          </div>
          <div style={s.summaryLine}>
            <span>Materials (incl. markup)</span>
            <span>${materials.toFixed(2)}</span>
          </div>
          <div style={{...s.summaryLine, justifyContent: "space-between"}}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{...s.summaryLine, color: C.sky}}>
            <span>HST (13%)</span>
            <span>${hst.toFixed(2)}</span>
          </div>
          <div style={s.summaryDivider} />
          <div style={s.summaryTotal}>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            style={pdfSuccess ? {...s.pdfBtnFull, ...s.pdfBtnSuccess} : s.pdfBtnFull}
            onClick={generatePDF}
          >
            {pdfSuccess ? "✓ PDF Downloaded!" : "⬇ Download Quote PDF"}
          </button>
        </div>

      </main>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────
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

function Row({ children }) {
  return <div style={s.row}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = {
  // LOGIN
  loginWrap: {
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: 20,
  },
  loginCard: {
    background: C.white,
    borderRadius: 20,
    padding: "48px 40px",
    maxWidth: 420, width: "100%",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
  },
  loginIcon: {
    width: 64, height: 64,
    background: C.navy,
    borderRadius: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  loginTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "2rem", color: C.navy,
    margin: "0 0 8px",
  },
  loginSub: {
    fontSize: "0.95rem", color: C.muted,
    margin: "0 0 32px",
  },
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", padding: "14px 20px",
    background: C.white,
    border: `1.5px solid ${C.border}`,
    borderRadius: 10,
    fontSize: "0.95rem", fontWeight: 600, color: C.text,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "box-shadow .2s",
    fontFamily: "'DM Sans', sans-serif",
  },
  loginFooter: {
    marginTop: 24, fontSize: "0.8rem", color: C.muted,
  },

  // APP SHELL
  appWrap: {
    minHeight: "100vh",
    background: C.light,
    fontFamily: "'DM Sans', sans-serif",
    color: C.text,
  },
  header: {
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    padding: "0 24px",
    height: 64,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 12px rgba(13,31,60,0.07)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 36, height: 36,
    background: C.navy, borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1.15rem", color: C.navy,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: C.navy,
    color: C.accent,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1rem",
  },
  logoutBtn: {
    background: "transparent",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: "0.82rem", color: C.muted,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },

  main: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "28px 20px 60px",
    display: "flex", flexDirection: "column", gap: 20,
  },

  // TOTAL BANNER
  totalBanner: {
    background: C.navy,
    borderRadius: 16,
    padding: "24px 28px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
    boxShadow: "0 8px 32px rgba(13,31,60,0.18)",
  },
  totalLabel: {
    fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)", marginBottom: 4,
  },
  totalAmount: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "2.6rem", color: C.white, lineHeight: 1,
  },
  pdfBtn: {
    background: C.accent, color: C.navy,
    border: "none", borderRadius: 10,
    padding: "13px 24px",
    fontSize: "0.95rem", fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.4)",
    transition: "opacity .2s, transform .15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  pdfBtnSuccess: {
    background: "#22c55e",
    boxShadow: "0 4px 16px rgba(34,197,94,0.4)",
  },

  // SECTIONS
  section: {
    background: C.white,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(13,31,60,0.04)",
  },
  sectionHeader: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "16px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: C.light,
  },
  sectionIcon: { fontSize: "1rem" },
  sectionTitle: {
    fontWeight: 600, fontSize: "0.88rem",
    letterSpacing: "0.05em", textTransform: "uppercase",
    color: C.navy,
  },
  sectionBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 },

  // FORM
  row: {
    display: "flex", gap: 16, flexWrap: "wrap",
  },
  field: {
    display: "flex", flexDirection: "column", gap: 6,
    flex: 1, minWidth: 140,
  },
  label: {
    fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.04em", textTransform: "uppercase",
    color: C.muted,
  },
  input: {
    padding: "10px 14px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 9,
    fontSize: "0.95rem",
    color: C.text,
    background: C.white,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color .2s",
  },
  fileLabel: {
    display: "block",
    padding: "10px 14px",
    border: `1.5px dashed ${C.border}`,
    borderRadius: 9,
    fontSize: "0.9rem",
    color: C.sky,
    cursor: "pointer",
    textAlign: "center",
    fontWeight: 500,
    background: C.light,
  },
  textarea: {
    padding: "10px 14px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 9,
    fontSize: "0.9rem",
    color: C.text,
    background: C.white,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    minHeight: 80,
    resize: "vertical",
    boxSizing: "border-box",
  },
  calcDisplay: {
    padding: "10px 14px",
    background: C.light,
    border: `1.5px solid ${C.border}`,
    borderRadius: 9,
    fontSize: "1rem",
    fontWeight: 600,
    color: C.navy,
  },

  // FIXTURES
  fixtureRow: {
    display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
  },
  fixtureLineTotal: {
    minWidth: 80,
    padding: "10px 0",
    fontWeight: 600,
    color: C.sky,
    fontSize: "0.95rem",
    textAlign: "right",
  },
  removeBtn: {
    background: "transparent",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.muted,
    cursor: "pointer",
    padding: "6px 10px",
    fontSize: "0.8rem",
    lineHeight: 1,
  },
  addBtn: {
    background: C.light,
    border: `1.5px dashed ${C.border}`,
    borderRadius: 9,
    color: C.sky,
    cursor: "pointer",
    padding: "10px 16px",
    fontSize: "0.88rem",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    alignSelf: "flex-start",
  },
  subtotalRow: {
    display: "flex", justifyContent: "space-between",
    padding: "10px 14px",
    background: C.light,
    borderRadius: 9,
    fontSize: "0.9rem",
    color: C.muted,
  },
  subtotalVal: { fontWeight: 600, color: C.navy },

  // SUMMARY
  summaryCard: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 2px 12px rgba(13,31,60,0.04)",
  },
  summaryTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1.3rem", color: C.navy,
    marginBottom: 16,
  },
  summaryLine: {
    display: "flex", justifyContent: "space-between",
    fontSize: "0.95rem", color: C.muted,
    padding: "8px 0",
    borderBottom: `1px solid ${C.border}`,
  },
  summaryDivider: { margin: "8px 0" },
  summaryTotal: {
    display: "flex", justifyContent: "space-between",
    fontFamily: "'DM Serif Display', serif",
    fontSize: "1.5rem", color: C.navy,
    padding: "10px 0 20px",
  },
  pdfBtnFull: {
    display: "block", width: "100%",
    background: C.accent, color: C.navy,
    border: "none", borderRadius: 10,
    padding: "14px",
    fontSize: "1rem", fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.35)",
    fontFamily: "'DM Sans', sans-serif",
  },
};
