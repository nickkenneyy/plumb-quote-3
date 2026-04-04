import { useState } from "react";
import { jsPDF } from "jspdf";

export default function App() {
  const [jobType, setJobType] = useState("Drain Cleaning");
  const [hours, setHours] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(120);
  const [materialCost, setMaterialCost] = useState(0);
  const [markup, setMarkup] = useState(1.4);
  const [clientName, setClientName] = useState("");

  // CALCULATIONS
  const laborCost = hourlyRate * hours;
  const materials = materialCost * markup;
  const subtotal = laborCost + materials;
  const total = subtotal;

  // PDF GENERATION
  const generatePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Plumb Quote 3", 20, 20);

    doc.setFontSize(12);
    doc.text(`Client: ${clientName}`, 20, 40);
    doc.text(`Job Type: ${jobType}`, 20, 50);
    doc.text(`Hourly Rate: $${hourlyRate}`, 20, 60);
    doc.text(`Hours: ${hours}`, 20, 70);

    doc.text(`Labor: $${laborCost.toFixed(2)}`, 20, 90);
    doc.text(`Materials: $${materials.toFixed(2)}`, 20, 100);
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 20, 110);

    doc.setFontSize(14);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 20, 130);

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

        <label>Hourly Rate ($)</label>
        <input
          type="number"
          style={styles.input}
          value={hourlyRate}
          onChange={(e) => setHourlyRate(Number(e.target.value))}
        />

        <label>Hours</label>
        <input
          type="number"
          style={styles.input}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        />

        <label>Material Cost ($)</label>
        <input
          type="number"
          style={styles.input}
          value={materialCost}
          onChange={(e) => setMaterialCost(Number(e.target.value))}
        />

        <label>Material Markup</label>
        <input
          type="number"
          step="0.1"
          style={styles.input}
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
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
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
    padding: "40px",
  },
  title: {
    fontSize: "32px",
    marginBottom: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "10px",
    maxWidth: "400px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "none",
  },
  result: {
    marginTop: "15px",
    background: "#0f172a",
    padding: "10px",
    borderRadius: "6px",
  },
  button: {
    marginTop: "15px",
    padding: "12px",
    width: "100%",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};