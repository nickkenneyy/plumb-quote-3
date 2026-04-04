import { useState } from "react";
import { jsPDF } from "jspdf";

export default function App() {
  const [jobType, setJobType] = useState("Drain Cleaning");
  const [hours, setHours] = useState(1);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [margin, setMargin] = useState(1.2);
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
  const total = subtotal * margin;

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
        <label>Company Name</label>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />

        <label>Client Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />

        <label>Job Type</label>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={styles.input}>
          {Object.keys(rates).map((job) => (
            <option key={job}>{job}</option>
          ))}
        </select>

        <label>Hours</label>
        <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} style={styles.input} />

        <label>Material Cost</label>
        <input type="number" value={materialCost} onChange={(e) => setMaterialCost(Number(e.target.value))} style={styles.input} />

        <label>Material Markup</label>
        <input type="number" step="0.1" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} style={styles.input} />

        <label>Profit Margin</label>
        <input type="number" step="0.1" value={margin} onChange={(e) => setMargin(Number(e.target.value))} style={styles.input} />

        <div style={styles.result}>
          <p>Labor: ${laborCost.toFixed(2)}</p>
          <p>Materials: ${materials.toFixed(2)}</p>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <h2>Total: ${total.toFixed(2)}</h2>
        </div>

        <button style={styles.button} onClick={generatePDF}>
          Download Quote
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