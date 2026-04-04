import { useState } from "react";
import { jsPDF } from "jspdf";
import logo from "./logo.png";

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
    const generatePDF = () => {
  const doc = new jsPDF();

  // LOGO
  doc.addImage(logo, "PNG", 20, 10, 40, 20);

  // COMPANY
  doc.setFontSize(16);
  doc.text("Plumb Quote 3", 70, 20);

  doc.setFontSize(10);
  doc.text("Professional Plumbing Services", 70, 28);

  // LINE
  doc.line(20, 50, 190, 50);

  // CLIENT
  doc.setFontSize(12);
  doc.text(`Client: ${clientName}`, 20, 65);
  doc.text(`Service: ${jobType}`, 20, 75);

  // TABLE HEADER
  doc.text("Description", 20, 95);
  doc.text("Amount", 160, 95);
  doc.line(20, 100, 190, 100);

  // ITEMS
  doc.text("Labor", 20, 115);
  doc.text(`$${laborCost.toFixed(2)}`, 160, 115);

  doc.text("Materials", 20, 125);
  doc.text(`$${materials.toFixed(2)}`, 160, 125);

  doc.text("Subtotal", 20, 135);
  doc.text(`$${subtotal.toFixed(2)}`, 160, 135);

  // TOTAL
  doc.setFontSize(14);
  doc.text("TOTAL", 20, 155);
  doc.text(`$${total.toFixed(2)}`, 160, 155);

  // FOOTER
  doc.setFontSize(10);
  doc.text("Thank you for your business.", 20, 180);

  doc.save(`${clientName || "quote"}.pdf`);
};
  };

  return (
    <div style={styles.container}>
      <img src={logo} alt="logo" style={{ width: "120px", marginBottom: "10px" }} />
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