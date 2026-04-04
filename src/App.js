import { useState } from "react";

export default function App() {
  const [jobType, setJobType] = useState("Drain Cleaning");
  const [hours, setHours] = useState(1);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [margin, setMargin] = useState(1.2);
  const [clientName, setClientName] = useState("");

  const rates = {
    "Drain Cleaning": 120,
    "Fixture Install": 150,
    "Pipe Repair": 180,
    "Emergency Call": 250,
  };

  const laborRate = rates[jobType];
  const laborCost = laborRate * hours;
  const materials = materialCost * markup;
  const subtotal = laborCost + materials;
  const total = subtotal * margin;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Plumbing Quote Tool</h1>

      <div style={styles.card}>
        <label style={styles.label}>Client Name</label>
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Job Type</label>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          style={styles.input}
        >
          {Object.keys(rates).map((job) => (
            <option key={job}>{job}</option>
          ))}
        </select>

        <label style={styles.label}>Hours</label>
        <input
          type="number"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          style={styles.input}
        />

        <label style={styles.label}>Material Cost ($)</label>
        <input
          type="number"
          value={materialCost}
          onChange={(e) => setMaterialCost(Number(e.target.value))}
          style={styles.input}
        />

        <label style={styles.label}>Material Markup</label>
        <input
          type="number"
          step="0.1"
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
          style={styles.input}
        />

        <label style={styles.label}>Profit Margin</label>
        <input
          type="number"
          step="0.1"
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
          style={styles.input}
        />

        <div style={styles.result}>
          <p>Labor: ${laborCost.toFixed(2)}</p>
          <p>Materials (with markup): ${materials.toFixed(2)}</p>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>

          <h2>Total Quote: ${total.toFixed(2)}</h2>

          {margin < 1.15 && (
            <p style={{ color: "red" }}>
              ⚠️ Warning: Low profit margin
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Arial",
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
  },
  label: {
    display: "block",
    marginTop: "15px",
    marginBottom: "5px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "none",
  },
  result: {
    marginTop: "20px",
    borderTop: "1px solid #334155",
    paddingTop: "15px",
  },
};