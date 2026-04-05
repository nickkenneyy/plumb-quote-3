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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const laborCost = hourlyRate * hours;
  const materials = materialCost * markup;
  const subtotal = laborCost + materials;
  const total = subtotal;

  // 🔥 CLEAN PROFESSIONAL PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // HEADER
    doc.setFontSize(20);
    doc.text(companyName, 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 35);
    doc.text(`Job Type: ${jobType}`, 20, 45);

    // LINE
    doc.line(20, 50, 190, 50);

    // TABLE STYLE
    doc.text("Description", 20, 60);
    doc.text("Amount", 150, 60);

    doc.line(20, 63, 190, 63);

    doc.text("Labor", 20, 75);
    doc.text(`$${laborCost.toFixed(2)}`, 150, 75);

    doc.text("Materials", 20, 85);
    doc.text(`$${materials.toFixed(2)}`, 150, 85);

    doc.text("Subtotal", 20, 100);
    doc.text(`$${subtotal.toFixed(2)}`, 150, 100);

    // TOTAL BOX
    doc.setFontSize(16);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, 120);

    // MATERIAL NOTES
    doc.setFontSize(11);
    doc.text("Materials Used:", 20, 140);
    doc.text(materialsList || "N/A", 20, 150);

    doc.save(`${clientName || "quote"}.pdf`);
  };

  // LOGIN SCREEN
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

      <button style={styles.logout} onClick={handleLogout}>
        Logout
      </button>

      <div style={styles.card}>
        <label>Company Name</label>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

        <label>Client Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} />

        <label>Job Type</label>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option>Drain Cleaning</option>
          <option>Fixture Install</option>
          <option>Pipe Repair</option>
          <option>Emergency Call</option>
        </select>

        <label>Hourly Rate</label>
        <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />

        <label>Hours</label>
        <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />

        <label>Material Cost</label>
        <input type="number" value={materialCost} onChange={(e) => setMaterialCost(Number(e.target.value))} />

        <label>Material Markup</label>
        <input type="number" step="0.1" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} />

        <label>Materials Used</label>
        <textarea
          placeholder="PVC pipe, fittings..."
          value={materialsList}
          onChange={(e) => setMaterialsList(e.target.value)}
        />

        <div style={styles.result}>
          <p>Labor: ${laborCost.toFixed(2)}</p>
          <p>Materials: ${materials.toFixed(2)}</p>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <h2>Total: ${total.toFixed(2)}</h2>
        </div>

        <button style={styles.button} onClick={generatePDF}>
          Download Quote PDF
        </button>
      </div>
    </div>
  );
}

// 🔥 CLEAN BLUE UI
const styles = {
  container: {
    fontFamily: "Arial",
    padding: 20,
    maxWidth: 500,
    margin: "auto",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#f5f8ff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 0 10px rgba(0,0,0,0.1)"
  },
  button: {
    marginTop: 15,
    padding: 12,
    background: "#2f5cff",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold"
  },
  logout: {
    marginBottom: 10
  },
  result: {
    marginTop: 10
  },
  login: {
    textAlign: "center",
    marginTop: 100
  }
};