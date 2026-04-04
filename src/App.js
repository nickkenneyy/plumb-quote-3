import { useState } from "react";
import { jsPDF } from "jspdf";

export default function App() {
  const [jobType, setJobType] = useState("Drain Cleaning");
  const [hours, setHours] = useState(1);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("Plumb Quote 3");

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
const total = subtotal;

  const generatePDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Plumb Quote 3", 20, 20);

  doc.setFontSize(12);
  doc.text(`Client: ${clientName}`, 20, 40);
  doc.text(`Job Type: ${jobType}`, 20, 50);

  doc.text(`Labor: $${laborCost.toFixed(2)}`, 20, 70);
  doc.text(`Materials: $${materials.toFixed(2)}`, 20, 80);
  doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 20, 90);

  doc.setFontSize(14);
  doc.text(`TOTAL: $${total.toFixed(2)}`, 20, 110);

  doc.save(`${clientName || "quote"}.pdf`);
};

  return (
    <div style={styles.container}>
  <h1 style={styles.title}>Plumb Quote 3</h1>

  <div style={styles.card}>
    <label>Client Name</label>
    <input
      style={styles.input}
      value={clientName}
      onChange={(e) => setClientName(e.target.value)}
    />

    <label>Job Type</label>
    <select
      style={styles.input}
      value={jobType}
      onChange={(e) => setJobType(e.target.value)}
    >
      <option>Drain Cleaning</option>
      <option>Fixture Install</option>
      <option>Pipe Repair</option>
      <option>Emergency Call</option>
    </select>

    <label>Hours</label>
    <input
      type="number"
      style={styles.input}
      value={hours}
      onChange={(e) => setHours(Number(e.target.value))}
    />

    <label>Materials ($)</label>
    <input
      type="number"
      style={styles.input}
      value={materialCost}
      onChange={(e) => setMaterialCost(Number(e.target.value))}
    />

    <h3>Subtotal: ${subtotal.toFixed(2)}</h3>
    <h2>Total: ${total.toFixed(2)}</h2>

    <button style={styles.button} onClick={generatePDF}>
      Download Quote PDF
    </button>
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
    marginBottom: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    width: "350px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "none",
  },
  result: {
    marginTop: "10px",
  },
  button: {
    marginTop: "20px",
    width: "100%",
    padding: "12px",
    background: "#22c55e",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};