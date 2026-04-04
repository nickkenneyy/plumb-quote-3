// src/pages/QuoteBuilderPage.jsx
// Core quote builder: all calculations are live (no submit button needed)

import React, { useState, useMemo } from "react";
import { calculateQuote, formatCurrency } from "../utils/calculate";
import { exportQuotePdf } from "../utils/exportPdf";

export default function QuoteBuilderPage({
  template,
  onSaveTemplate,
  onBack,
}) {
  // Initialize fields from selected template
  const [fields, setFields] = useState({
    name: template?.name || "Custom Job",
    description: template?.description || "",
    icon: template?.icon || "📋",
    laborHours: template?.laborHours ?? 2,
    hourlyRate: template?.hourlyRate ?? 125,
    materialCost: template?.materialCost ?? 100,
    materialMarkup: template?.materialMarkup ?? 1.4,
    profitMargin: template?.profitMargin ?? 1.2,
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Update a single field
  const update = (key, value) => {
    setSaved(false);
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  // Live calculation — recalculates on every keystroke
  const calc = useMemo(() => calculateQuote(fields), [fields]);

  // Save current values as a reusable template
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveTemplate({
        ...fields,
        id: template?.isDefault ? undefined : template?.id, // New doc if default
      });
      setSaved(true);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Export to PDF
  const handleExport = () => {
    setExporting(true);
    try {
      exportQuotePdf({ ...fields, ...calc });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-body pb-8">
      {/* Top Nav */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-lg leading-none"
        >
          ←
        </button>
        <span className="text-xl">{fields.icon}</span>
        <span className="font-display text-white text-lg font-bold uppercase tracking-wide flex-1 truncate">
          {fields.name}
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Job Name (editable) */}
        <InputCard label="Job Name">
          <input
            type="text"
            value={fields.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full bg-transparent text-white text-lg font-semibold outline-none placeholder-slate-600"
            placeholder="e.g. Water Heater Replacement"
          />
        </InputCard>

        {/* Labor Section */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Labor
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Hours"
                value={fields.laborHours}
                onChange={(v) => update("laborHours", v)}
                step={0.5}
                min={0}
                suffix="hrs"
              />
              <NumberField
                label="Hourly Rate"
                value={fields.hourlyRate}
                onChange={(v) => update("hourlyRate", v)}
                step={5}
                min={0}
                prefix="$"
              />
            </div>
          </div>
          <div className="px-4 py-3 bg-slate-900/50 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Labor Total</span>
            <span className="text-white font-semibold">
              {formatCurrency(calc.laborTotal)}
            </span>
          </div>
        </div>

        {/* Materials Section */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Materials
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Material Cost"
                value={fields.materialCost}
                onChange={(v) => update("materialCost", v)}
                step={10}
                min={0}
                prefix="$"
              />
              <NumberField
                label="Markup"
                value={fields.materialMarkup}
                onChange={(v) => update("materialMarkup", v)}
                step={0.05}
                min={1}
                suffix="×"
              />
            </div>
          </div>
          <div className="px-4 py-3 bg-slate-900/50 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Materials Total</span>
            <span className="text-white font-semibold">
              {formatCurrency(calc.materialsTotal)}
            </span>
          </div>
        </div>

        {/* Profit Margin */}
        <InputCard label="Profit Margin">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="2"
              step="0.01"
              value={fields.profitMargin}
              onChange={(e) => update("profitMargin", parseFloat(e.target.value))}
              className="flex-1 accent-rust-500 h-2"
            />
            <div className="bg-slate-700 rounded-lg px-3 py-1.5 min-w-[64px] text-center">
              <span className="text-white font-semibold">
                {Math.round((fields.profitMargin - 1) * 100)}%
              </span>
            </div>
          </div>
        </InputCard>

        {/* Warnings */}
        {calc.warnings.map((w, i) => (
          <div
            key={i}
            className="bg-amber-900/40 border border-amber-700/60 text-amber-300 rounded-xl px-4 py-3 text-sm font-medium"
          >
            {w}
          </div>
        ))}

        {/* Final Price — the hero number */}
        <div className="bg-rust-500 rounded-2xl p-6 text-center shadow-xl shadow-rust-500/30">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-1">
            Total Estimate
          </div>
          <div className="text-white font-display font-bold text-5xl tracking-tight">
            {formatCurrency(calc.finalPrice)}
          </div>
          <div className="mt-3 flex justify-center gap-6 text-white/60 text-xs">
            <span>Labor: {formatCurrency(calc.laborTotal)}</span>
            <span>Materials: {formatCurrency(calc.materialsTotal)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`py-4 rounded-xl font-semibold text-base transition-all active:scale-95 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Template"}
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-pipe-600 hover:bg-pipe-700 active:scale-95 text-white py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2"
          >
            <span>📄</span>
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Field Components ──────────────────────────

function InputCard({ label, children }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 px-4 py-4">
      <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, step, min, prefix, suffix }) {
  return (
    <div>
      <label className="text-slate-400 text-xs block mb-1.5">{label}</label>
      <div className="flex items-center bg-slate-700 rounded-xl px-3 py-2.5 gap-1">
        {prefix && <span className="text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          className="bg-transparent text-white w-full outline-none text-base font-semibold min-w-0"
        />
        {suffix && <span className="text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}
