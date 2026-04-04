// src/utils/exportPdf.js
// Generates a clean, professional PDF quote using jsPDF

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./calculate";

/**
 * Export a quote as a PDF file
 * @param {object} quote - All quote fields + calculated values
 * @param {string} companyName - Optional company name
 */
export function exportQuotePdf(quote, companyName = "Your Plumbing Co.") {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Header ──────────────────────────────────────────
  doc.setFillColor(12, 74, 110); // Dark blue header
  doc.rect(0, 0, 220, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 14, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("JOB ESTIMATE", 14, 28);
  doc.text(`Date: ${today}`, 14, 35);

  // ── Job Info ─────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(quote.name, 14, 58);

  if (quote.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(quote.description, 14, 66);
  }

  // ── Cost Breakdown Table ──────────────────────────────
  autoTable(doc, {
    startY: 76,
    head: [["Description", "Details", "Amount"]],
    body: [
      [
        "Labor",
        `${quote.laborHours} hrs × ${formatCurrency(quote.hourlyRate)}/hr`,
        formatCurrency(quote.laborTotal),
      ],
      [
        "Materials",
        `${formatCurrency(quote.materialCost)} × ${quote.materialMarkup}x markup`,
        formatCurrency(quote.materialsTotal),
      ],
      ["Subtotal", "", formatCurrency(quote.subtotal)],
      [
        "Profit Margin",
        `${((quote.profitMargin - 1) * 100).toFixed(0)}%`,
        "",
      ],
    ],
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: [12, 74, 110], textColor: 255, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" } },
    alternateRowStyles: { fillColor: [240, 249, 255] },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // ── Final Price Box ───────────────────────────────────
  doc.setFillColor(234, 88, 12); // Orange accent
  doc.roundedRect(14, finalY, 182, 24, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL ESTIMATE", 22, finalY + 10);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(quote.finalPrice), 185, finalY + 14, {
    align: "right",
  });

  // ── Footer ────────────────────────────────────────────
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This estimate is valid for 30 days. Prices may vary based on final scope of work.",
    14,
    finalY + 38
  );

  // Save the file
  const filename = `quote-${quote.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
  doc.save(filename);
}
