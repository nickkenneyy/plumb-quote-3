import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { jsPDF } from "jspdf";

export default function App() {
  const [user, setUser] = useState(null);

  // STATE
  const [companyName, setCompanyName] = useState("Plumb Quote 3");
  const [clientName, setClientName] = useState("");
  const [jobType, setJobType] = useState("Drain Cleaning");
  const [hours, setHours] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(120);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [materialsList, setMaterialsList] = useState("");

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // LOGIN (FIXED)
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Check console.");
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    await signOut(auth);
  };

  // CALCULATIONS
  const laborCost = hourlyRate * hours;
  const materials = materialCost * markup;
  const subtotal = laborCost + materials;
  const total = subtotal;

  // PDF (LOCKED)
  const generatePDF = () => {
    if (!user) {
      alert("Login required to download PDF");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(companyName, 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 40);
    doc.text(`Job Type: ${jobType}`, 20, 50);
    doc.text(`Hours: ${hours}`, 20, 60);

    doc.text(`Materials Used:`, 20, 80);
    doc.text(materialsList || "N/A", 20, 90);

    doc.text(`Labor: $${laborCost.toFixed(2)}`, 20, 110);
    doc.text(`Materials: $${materials.toFixed(2)}`, 20, 120);
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 20, 130);

    doc.setFontSize(14);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, 150);

    doc.save(`${clientName || "quote"}.pdf`);
  };

  // 🔒 LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.center}>
        <h1>Plumb Quote 3</h1>
        <p>Login to access the app</p>
        <button style={styles.button} onClick={handleLogin}>
          Login with Google
        </button>
      </div>
    );
  }

  // ✅ MAIN APP
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

// STYLES
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
  },
  result: {
    marginTop: 10,
  },
  button: {
    marginTop: 15,
    padding: 10,
    background: "black",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  logout: {
    marginBottom: 10,
  },
  center: {
    textAlign: "center",
    marginTop: 100,
  },
};