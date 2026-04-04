// src/utils/calculate.js
// Core pricing formulas — single source of truth for all calculations

/**
 * Calculate full quote breakdown from inputs
 * @param {object} inputs - { laborHours, hourlyRate, materialCost, materialMarkup, profitMargin }
 * @returns {object} - { laborTotal, materialsTotal, subtotal, finalPrice, warnings }
 */
export function calculateQuote({
  laborHours = 0,
  hourlyRate = 125,
  materialCost = 0,
  materialMarkup = 1.4,
  profitMargin = 1.2,
}) {
  const labor = parseFloat(laborHours) || 0;
  const rate = parseFloat(hourlyRate) || 0;
  const materials = parseFloat(materialCost) || 0;
  const markup = parseFloat(materialMarkup) || 1;
  const margin = parseFloat(profitMargin) || 1;

  // Core formula
  const laborTotal = labor * rate;
  const materialsTotal = materials * markup;
  const subtotal = laborTotal + materialsTotal;
  const finalPrice = subtotal * margin;

  // Profit protection warnings
  const warnings = [];
  if (margin < 1.15) {
    warnings.push("⚠️ You may be underpricing this job (margin below 15%)");
  }
  if (rate < 75) {
    warnings.push("⚠️ Hourly rate is below market minimum ($75/hr)");
  }

  return {
    laborTotal,
    materialsTotal,
    subtotal,
    finalPrice,
    warnings,
  };
}

/** Format a number as USD currency */
export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);
}
