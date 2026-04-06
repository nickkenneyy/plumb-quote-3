import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
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
};

const JOB_TYPES = ["Drain Cleaning", "Fixture Install", "Pipe Repair", "Rough In"];

// ── Default Ontario-based pipe prices per foot (editable baseline)
// Estimates loosely based on Home Depot CA / Wolseley / Noble Trade
// Treat as starting values only — not guaranteed accurate
const DEFAULT_PIPES = [
  { type: "PVC",    pricePerFt: 1.20, length: 0 },
  { type: "ABS",    pricePerFt: 1.45, length: 0 },
  { type: "Copper", pricePerFt: 4.80, length: 0 },
  { type: "PEX",    pricePerFt: 1.10, length: 0 },
];

// ── Default Ontario-based fitting prices (editable baseline)
const DEFAULT_FITTINGS = [
  { name: "90\u00b0 Elbow", unitPrice: 2.50, qty: 0 },
  { name: "45\u00b0 Elbow", unitPrice: 2.25, qty: 0 },
  { name: "Tee",            unitPrice: 3.20, qty: 0 },
  { name: "Coupling",       unitPrice: 1.80, qty: 0 },
  { name: "Reducer",        unitPrice: 2.75, qty: 0 },
  { name: "Cap",            unitPrice: 1.50, qty: 0 },
];

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

  // ── Rough-In state
  const [pipes, setPipes]           = useState(DEFAULT_PIPES.map(p => ({ ...p })));
  const [fittings, setFittings]     = useState(DEFAULT_FITTINGS.map(f => ({ ...f })));
  const [roughLabour, setRoughLabour] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogin  = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const addFixture    = () => setFixtures([...fixtures, { name: "", labour: 0, qty: 1 }]);
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

  const updatePipe = (i, field, value) => {
    const updated = [...pipes];
    updated[i][field] = value;
    setPipes(updated);
  };

  const updateFitting = (i, field, value) => {
    const updated = [...fittings];
    updated[i][field] = value;
    setFittings(updated);
  };

  // ── Calculations
  const laborCost    = hourlyRate * hours;
  const materials    = materialCost * markup;
  const fixtureTotal = fixtures.reduce((s, f) => s + Number(f.labour) * Number(f.qty), 0);
  const pipesTotal   = pipes.reduce((s, p) => s + Number(p.length) * Number(p.pricePerFt), 0);
  const fittingsTotal = fittings.reduce((s, f) => s + Number(f.qty) * Number(f.unitPrice), 0);
  const roughInTotal = pipesTotal + fittingsTotal + Number(roughLabour);

  const subtotal =
    jobType === "Fixture Install" ? fixtureTotal + materials
    : jobType === "Rough In"     ? roughInTotal
    : laborCost + materials;

  const HST_RATE = 0.13;
  const hst      = subtotal * HST_RATE;
  const total    = subtotal + hst;

  // ── PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    if (logo) doc.addImage(logo, "PNG", 150, 10, 40, 20);
    doc.setFontSize(20);
    doc.text(companyName, 20, 20);
    doc.setFontSize(12);
    doc.text("Client: " + clientName, 20, 35);
    doc.text("Job Type: " + jobType, 20, 45);
    doc.line(20, 50, 190, 50);
    let y = 65;

    if (jobType === "Rough In") {
      doc.setFontSize(13);
      doc.setTextColor(13, 31, 60);
      doc.text("PIPING", 20, y); y += 8;
      doc.setFontSize(10);
      doc.setTextColor(99, 117, 146);
      doc.text("Type", 20, y); doc.text("Length (ft)", 80, y);
      doc.text("$/ft", 130, y); doc.text("Cost", 165, y); y += 6;
      doc.line(20, y, 190, y); y += 8;
      doc.setTextColor(42, 58, 82);
      pipes.forEach((p) => {
        if (Number(p.length) > 0) {
          const cost = Number(p.length) * Number(p.pricePerFt);
          doc.text(p.type, 20, y);
          doc.text(p.length + " ft", 80, y);
          doc.text("$" + Number(p.pricePerFt).toFixed(2), 130, y);
          doc.text("$" + cost.toFixed(2), 165, y);
          y += 9;
        }
      });
      doc.setTextColor(99, 117, 146);
      doc.text("Piping Subtotal", 130, y);
      doc.setTextColor(42, 58, 82);
      doc.text("$" + pipesTotal.toFixed(2), 165, y); y += 14;

      doc.setFontSize(13);
      doc.setTextColor(13, 31, 60);
      doc.text("FITTINGS", 20, y); y += 8;
      doc.setFontSize(10);
      doc.setTextColor(99, 117, 146);
      doc.text("Fitting", 20, y); doc.text("Qty", 100, y);
      doc.text("Unit Price", 130, y); doc.text("Total", 165, y); y += 6;
      doc.line(20, y, 190, y); y += 8;
      doc.setTextColor(42, 58, 82);
      fittings.forEach((f) => {
        if (Number(f.qty) > 0) {
          const cost = Number(f.qty) * Number(f.unitPrice);
          doc.text(f.name, 20, y);
          doc.text(String(f.qty), 100, y);
          doc.text("$" + Number(f.unitPrice).toFixed(2), 130, y);
          doc.text("$" + cost.toFixed(2), 165, y);
          y += 9;
        }
      });
      doc.setTextColor(99, 117, 146);
      doc.text("Fittings Subtotal", 130, y);
      doc.setTextColor(42, 58, 82);
      doc.text("$" + fittingsTotal.toFixed(2), 165, y); y += 14;

      if (Number(roughLabour) > 0) {
        doc.text("Labour", 20, y);
        doc.text("$" + Number(roughLabour).toFixed(2), 165, y);
        y += 10;
      }
      doc.line(20, y, 190, y); y += 10;

    } else if (jobType === "Fixture Install") {
      fixtures.forEach((f) => {
        if (f.name && f.labour > 0) {
          doc.text(f.name + " install labour x" + f.qty, 20, y);
          doc.text("$" + (Number(f.labour) * Number(f.qty)).toFixed(2), 165, y);
          y += 10;
        }
      });
    } else {
      doc.text("Labour", 20, y);
      doc.text("$" + laborCost.toFixed(2), 165, y); y += 10;
      doc.text("Materials", 20, y);
      doc.text("$" + materials.toFixed(2), 165, y); y += 10;
    }

    doc.setFontSize(12);
    doc.setTextColor(99, 117, 146);
    doc.text("Subtotal", 130, y);
    doc.setTextColor(42, 58, 82);
    doc.text("$" + subtotal.toFixed(2), 165, y); y += 9;
    doc.setTextColor(99, 117, 146);
    doc.text("HST (13%)", 130, y);
    doc.setTextColor(42, 58, 82);
    doc.text("$" + hst.toFixed(2), 165, y); y += 9;
    doc.line(130, y, 190, y); y += 7;
    doc.setFontSize(14);
    doc.setTextColor(13, 31, 60);
    doc.text("TOTAL", 130, y);
    doc.text("$" + total.toFixed(2), 165, y);

    if (jobType !== "Rough In" && materialsList) {
      doc.setFontSize(10);
      doc.setTextColor(99, 117, 146);
      doc.text("Materials Used:", 20, y + 15);
      doc.setTextColor(42, 58, 82);
      doc.text(materialsList, 20, y + 25);
    }

    doc.save((clientName || "quote") + ".pdf");
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  // ─── LOGIN SCREEN
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
          <h1 style={s.loginTitle}>Plumb<span style={{ color: C.sky }}>Quote</span> 3</h1>
          <p style={s.loginSub}>Professional plumbing estimates in 30 seconds</p>
          <button style={s.googleBtn} onClick={handleLogin}>
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

  // ─── MAIN APP
  return (
    <div style={s.appWrap}>

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
        <div style={s.headerRight}>
          <div style={s.avatar}>{user.displayName?.[0] ?? "U"}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main style={s.main}>

        {/* TOTAL BANNER */}
        <div style={s.totalBanner}>
          <div>
            <div style={s.totalLabel}>Estimated Total</div>
            <div style={s.totalAmount}>${total.toFixed(2)}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>incl. HST (13%)</div>
          </div>
          <button style={pdfSuccess ? { ...s.pdfBtn, ...s.pdfBtnSuccess } : s.pdfBtn} onClick={generatePDF}>
            {pdfSuccess ? "✓ Downloaded!" : "⬇ Download PDF"}
          </button>
        </div>

        {/* JOB DETAILS */}
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

        {/* ROUGH-IN ESTIMATOR */}
        {jobType === "Rough In" && (
          <>
            <Section title="Rough-In — Pipe Types" icon="🔩">
              <div style={s.roughDisclaimer}>
                ⚠ Prices are editable baseline estimates based on Ontario supply averages (Home Depot CA, Wolseley, Noble Trade). Adjust to your actual costs.
              </div>
              <div style={s.roughHeader}>
                <span style={{ flex: 2 }}>Pipe Type</span>
                <span style={{ flex: 2 }}>Length (ft)</span>
                <span style={{ flex: 2 }}>Price / ft ($)</span>
                <span style={{ flex: 1, textAlign: "right" }}>Cost</span>
              </div>
              {pipes.map((p, i) => (
                <div key={i} style={s.roughRow}>
                  <div style={{ ...s.roughTypeTag, flex: 2 }}>{p.type}</div>
                  <input
                    style={{ ...s.input, flex: 2 }}
                    type="number" min="0" placeholder="0"
                    value={p.length || ""}
                    onChange={(e) => updatePipe(i, "length", e.target.value)}
                  />
                  <input
                    style={{ ...s.input, flex: 2 }}
                    type="number" min="0" step="0.01"
                    value={p.pricePerFt}
                    onChange={(e) => updatePipe(i, "pricePerFt", e.target.value)}
                  />
                  <div style={{ ...s.fixtureLineTotal, flex: 1 }}>
                    ${(Number(p.length) * Number(p.pricePerFt)).toFixed(2)}
                  </div>
                </div>
              ))}
              <div style={s.subtotalRow}>
                <span>Piping Subtotal</span>
                <span style={s.subtotalVal}>${pipesTotal.toFixed(2)}</span>
              </div>
            </Section>

            <Section title="Rough-In — Fittings" icon="🔧">
              <div style={s.roughHeader}>
                <span style={{ flex: 3 }}>Fitting</span>
                <span style={{ flex: 2 }}>Qty</span>
                <span style={{ flex: 2 }}>Unit Price ($)</span>
                <span style={{ flex: 1, textAlign: "right" }}>Total</span>
              </div>
              {fittings.map((f, i) => (
                <div key={i} style={s.roughRow}>
                  <div style={{ ...s.roughTypeTag, flex: 3 }}>{f.name}</div>
                  <input
                    style={{ ...s.input, flex: 2 }}
                    type="number" min="0" placeholder="0"
                    value={f.qty || ""}
                    onChange={(e) => updateFitting(i, "qty", e.target.value)}
                  />
                  <input
                    style={{ ...s.input, flex: 2 }}
                    type="number" min="0" step="0.01"
                    value={f.unitPrice}
                    onChange={(e) => updateFitting(i, "unitPrice", e.target.value)}
                  />
                  <div style={{ ...s.fixtureLineTotal, flex: 1 }}>
                    ${(Number(f.qty) * Number(f.unitPrice)).toFixed(2)}
                  </div>
                </div>
              ))}
              <div style={s.subtotalRow}>
                <span>Fittings Subtotal</span>
                <span style={s.subtotalVal}>${fittingsTotal.toFixed(2)}</span>
              </div>
            </Section>

            <Section title="Rough-In — Labour" icon="👷">
              <Row>
                <Field label="Labour Cost ($)">
                  <input
                    style={s.input}
                    type="number" min="0" placeholder="0.00"
                    value={roughLabour || ""}
                    onChange={(e) => setRoughLabour(e.target.value)}
                  />
                </Field>
                <Field label="Total Rough-In Cost">
                  <div style={s.calcDisplay}>${roughInTotal.toFixed(2)}</div>
                </Field>
              </Row>
            </Section>
          </>
        )}

        {/* LABOUR (hidden for Rough In) */}
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
                <div style={s.subtotalRow}>
                  <span>Fixture Labour Subtotal</span>
                  <span style={s.subtotalVal}>${fixtureTotal.toFixed(2)}</span>
                </div>
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

        {/* MATERIALS (hidden for Rough In) */}
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

        {/* SUMMARY */}
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
          <div style={{ ...s.summaryLine, justifyContent: "space-between" }}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div style={{ ...s.summaryLine, color: C.sky }}><span>HST (13%)</span><span>${hst.toFixed(2)}</span></div>
          <div style={s.summaryDivider} />
          <div style={s.summaryTotal}><span>Total</span><span>${total.toFixed(2)}</span></div>
          <button style={pdfSuccess ? { ...s.pdfBtnFull, ...s.pdfBtnSuccess } : s.pdfBtnFull} onClick={generatePDF}>
            {pdfSuccess ? "✓ PDF Downloaded!" : "⬇ Download Quote PDF"}
          </button>
        </div>

      </main>
    </div>
  );
}

// ── Helper components
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

// ── Styles
const s = {
  loginWrap: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0d1f3c 0%, #1a4b8c 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif", padding: 20,
  },
  loginCard: {
    background: "#ffffff", borderRadius: 20,
    padding: "48px 40px", maxWidth: 420, width: "100%",
    textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
  },
  loginIcon: {
    width: 64, height: 64, background: "#0d1f3c", borderRadius: 16,
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
  },
  loginTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0d1f3c", margin: "0 0 8px" },
  loginSub: { fontSize: "0.95rem", color: "#637592", margin: "0 0 32px" },
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", padding: "14px 20px", background: "#ffffff",
    border: "1.5px solid #d4e1f5", borderRadius: 10,
    fontSize: "0.95rem", fontWeight: 600, color: "#2a3a52", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "'DM Sans', sans-serif",
  },
  loginFooter: { marginTop: 24, fontSize: "0.8rem", color: "#637592" },
  appWrap: { minHeight: "100vh", background: "#f0f5fc", fontFamily: "'DM Sans', sans-serif", color: "#2a3a52" },
  header: {
    background: "#ffffff", borderBottom: "1px solid #d4e1f5",
    padding: "0 24px", height: 64,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 12px rgba(13,31,60,0.07)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerIcon: { width: 36, height: 36, background: "#0d1f3c", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0d1f3c" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%", background: "#0d1f3c", color: "#f5a623",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Serif Display', serif", fontSize: "1rem",
  },
  logoutBtn: {
    background: "transparent", border: "1px solid #d4e1f5", borderRadius: 8,
    padding: "6px 14px", fontSize: "0.82rem", color: "#637592",
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  main: { maxWidth: 780, margin: "0 auto", padding: "28px 20px 60px", display: "flex", flexDirection: "column", gap: 20 },
  totalBanner: {
    background: "#0d1f3c", borderRadius: 16, padding: "24px 28px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16, boxShadow: "0 8px 32px rgba(13,31,60,0.18)",
  },
  totalLabel: { fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  totalAmount: { fontFamily: "'DM Serif Display', serif", fontSize: "2.6rem", color: "#ffffff", lineHeight: 1 },
  pdfBtn: {
    background: "#f5a623", color: "#0d1f3c", border: "none", borderRadius: 10,
    padding: "13px 24px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(245,166,35,0.4)", fontFamily: "'DM Sans', sans-serif",
  },
  pdfBtnSuccess: { background: "#22c55e", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" },
  section: { background: "#ffffff", borderRadius: 16, border: "1px solid #d4e1f5", overflow: "hidden", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", borderBottom: "1px solid #d4e1f5", background: "#f0f5fc" },
  sectionIcon: { fontSize: "1rem" },
  sectionTitle: { fontWeight: 600, fontSize: "0.88rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "#0d1f3c" },
  sectionBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 },
  label: { fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#637592" },
  input: {
    padding: "10px 14px", border: "1.5px solid #d4e1f5", borderRadius: 9,
    fontSize: "0.95rem", color: "#2a3a52", background: "#ffffff", outline: "none",
    fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box",
  },
  fileLabel: {
    display: "block", padding: "10px 14px", border: "1.5px dashed #d4e1f5",
    borderRadius: 9, fontSize: "0.9rem", color: "#2e7dd1", cursor: "pointer",
    textAlign: "center", fontWeight: 500, background: "#f0f5fc",
  },
  textarea: {
    padding: "10px 14px", border: "1.5px solid #d4e1f5", borderRadius: 9,
    fontSize: "0.9rem", color: "#2a3a52", background: "#ffffff", outline: "none",
    fontFamily: "'DM Sans', sans-serif", width: "100%", minHeight: 80,
    resize: "vertical", boxSizing: "border-box",
  },
  calcDisplay: {
    padding: "10px 14px", background: "#f0f5fc", border: "1.5px solid #d4e1f5",
    borderRadius: 9, fontSize: "1rem", fontWeight: 600, color: "#0d1f3c",
  },
  fixtureRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  fixtureLineTotal: { minWidth: 80, padding: "10px 0", fontWeight: 600, color: "#2e7dd1", fontSize: "0.95rem", textAlign: "right" },
  removeBtn: {
    background: "transparent", border: "1px solid #d4e1f5", borderRadius: 6,
    color: "#637592", cursor: "pointer", padding: "6px 10px", fontSize: "0.8rem", lineHeight: 1,
  },
  addBtn: {
    background: "#f0f5fc", border: "1.5px dashed #d4e1f5", borderRadius: 9,
    color: "#2e7dd1", cursor: "pointer", padding: "10px 16px",
    fontSize: "0.88rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", alignSelf: "flex-start",
  },
  subtotalRow: {
    display: "flex", justifyContent: "space-between", padding: "10px 14px",
    background: "#f0f5fc", borderRadius: 9, fontSize: "0.9rem", color: "#637592", marginTop: 4,
  },
  subtotalVal: { fontWeight: 600, color: "#0d1f3c" },
  roughDisclaimer: {
    background: "#fffbeb", border: "1px solid #fde68a",
    borderRadius: 9, padding: "10px 14px", fontSize: "0.8rem", color: "#92400e", lineHeight: 1.5,
  },
  roughHeader: {
    display: "flex", gap: 10, alignItems: "center", padding: "0 4px",
    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", color: "#637592",
  },
  roughRow: { display: "flex", gap: 10, alignItems: "center" },
  roughTypeTag: {
    padding: "10px 14px", background: "#f0f5fc", border: "1.5px solid #d4e1f5",
    borderRadius: 9, fontSize: "0.9rem", fontWeight: 600, color: "#0d1f3c", whiteSpace: "nowrap",
  },
  summaryCard: { background: "#ffffff", border: "1px solid #d4e1f5", borderRadius: 16, padding: "24px", boxShadow: "0 2px 12px rgba(13,31,60,0.04)" },
  summaryTitle: { fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "#0d1f3c", marginBottom: 16 },
  summaryLine: { display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#637592", padding: "8px 0", borderBottom: "1px solid #d4e1f5" },
  summaryDivider: { margin: "8px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "#0d1f3c", padding: "10px 0 20px" },
  pdfBtnFull: {
    display: "block", width: "100%", background: "#f5a623", color: "#0d1f3c",
    border: "none", borderRadius: 10, padding: "14px", fontSize: "1rem", fontWeight: 600,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(245,166,35,0.35)", fontFamily: "'DM Sans', sans-serif",
  },
};
