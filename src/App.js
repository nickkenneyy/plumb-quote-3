import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { jsPDF } from "jspdf";

export default function App() {
  const [user, setUser] = useState(null);

  const [companyName, setCompanyName] = useState("Plumb Quote 3");
  const [clientName, setClientName] = useState("");
  const [jobType, setJobType] = useState("Drain Cleaning");

  const [hours, setHours] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(120);

  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [materialsList, setMaterialsList] = useState("");

  const [logo, setLogo] = useState(null);

  // 🔥 FIXTURE (LABOUR ONLY)
  const [fixtures, setFixtures] = useState([
    { name: "", labour: 0, qty: 1 }
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const addFixture = () => {
    setFixtures([...fixtures, { name: "", labour: 0, qty: 1 }]);
  };

  const updateFixture = (index, field, value) => {
    const updated = [...fixtures];
    updated[index][field] = value;
    setFixtures(updated);
  };

  // CALCULATIONS
  const laborCost = hourlyRate * hours;
  const materials = materialCost * markup;

  const fixtureTotal = fixtures.reduce((sum, f) => {
    const line = Number(f.labour) * Number(f.qty);
    return sum + line;
  }, 0);

  const subtotal =
    jobType === "Fixture Install"
      ? fixtureTotal + materials
      : laborCost + materials;

  const total = subtotal;

  const handleLogoUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(e.target.files[0]);
  };

  // PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    if (logo) {
      doc.addImage(logo, "PNG", 150, 10, 40, 20);
    }

    doc.setFontSize(20);
    doc.text(companyName, 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 35);
    doc.text(`Job Type: ${jobType}`, 20, 45);

    doc.line(20, 50, 190, 50);

    let y = 65;

    if (jobType === "Fixture Install") {
      fixtures.forEach((f) => {
        if (f.name) {
          const lineTotal = Number(f.labour) * Number(f.qty);

          doc.text(`${f.name} x${f.qty}`, 20, y);
          doc.text(`$${lineTotal.toFixed(2)}`, 150, y);

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

    doc.setFontSize(14);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, y);

    doc.setFontSize(10);
    doc.text("Materials Used:", 20, y + 15);
    doc.text(materialsList || "N/A", 20, y + 25);

    doc.save(`${clientName || "quote"}.pdf`);
  };

  if (!user) {
    return (
      <div style={styles.login}>
        <h1>Plumb Quote 3</h1>
        <button style={styles.button} onClick={handleLogin}>
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>{companyName}</h1>

      <button onClick={handleLogout}>Logout</button>

      <div style={styles.card}>
        <label>Company Name</label>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

        <label>Upload Logo</label>
        <input type="file" onChange={handleLogoUpload} />

        <label>Client Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} />

        <label>Job Type</label>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option>Drain Cleaning</option>
          <option>Fixture Install</option>
          <option>Pipe Repair</option>
        </select>

        {jobType === "Fixture Install" ? (
          <>
            <h3>Fixtures (Labour Only)</h3>

            {fixtures.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <input
                  placeholder="Fixture"
                  value={f.name}
                  onChange={(e) => updateFixture(i, "name", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Labour $"
                  value={f.labour}
                  onChange={(e) => updateFixture(i, "labour", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Qty"
                  value={f.qty}
                  onChange={(e) => updateFixture(i, "qty", e.target.value)}
                />
              </div>
            ))}

            <button onClick={addFixture}>+ Add Fixture</button>
          </>
        ) : (
          <>
            <label>Hourly Rate</label>
            <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />

            <label>Hours</label>
            <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </>
        )}

        <label>Material Cost</label>
        <input type="number" value={materialCost} onChange={(e) => setMaterialCost(Number(e.target.value))} />

        <label>Markup</label>
        <input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} />

        <label>Materials Used</label>
        <textarea value={materialsList} onChange={(e) => setMaterialsList(e.target.value)} />

        <h2>Total: ${total.toFixed(2)}</h2>

        <button style={styles.button} onClick={generatePDF}>
          Download PDF
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, maxWidth: 500, margin: "auto" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#f0f4ff",
    padding: 20,
    borderRadius: 10
  },
  button: {
    background: "#2f5cff",
    color: "white",
    padding: 10,
    border: "none"
  },
  login: {
    textAlign: "center",
    marginTop: 100
  }
};