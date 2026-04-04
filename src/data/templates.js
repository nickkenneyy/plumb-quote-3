// src/data/templates.js
// Default job templates preloaded for every new user
// These are the 4 core plumbing job types with sensible defaults

export const DEFAULT_TEMPLATES = [
  {
    id: "service-call",
    name: "Service Call",
    icon: "🔧",
    description: "Diagnostic visit + minor repair",
    laborHours: 1.5,
    hourlyRate: 125,
    materialCost: 45,
    materialMarkup: 1.4,
    profitMargin: 1.2,
    isDefault: true,
  },
  {
    id: "toilet-install",
    name: "Toilet Installation",
    icon: "🚽",
    description: "Remove old unit + install new toilet",
    laborHours: 2.5,
    hourlyRate: 125,
    materialCost: 280,
    materialMarkup: 1.4,
    profitMargin: 1.2,
    isDefault: true,
  },
  {
    id: "bathroom-rough-in",
    name: "Bathroom Rough-In",
    icon: "🏗️",
    description: "Rough plumbing for new bathroom",
    laborHours: 12,
    hourlyRate: 125,
    materialCost: 850,
    materialMarkup: 1.4,
    profitMargin: 1.2,
    isDefault: true,
  },
  {
    id: "drain-cleaning",
    name: "Drain Cleaning",
    icon: "🌀",
    description: "Snake or hydro-jet drain clearing",
    laborHours: 1,
    hourlyRate: 125,
    materialCost: 25,
    materialMarkup: 1.4,
    profitMargin: 1.2,
    isDefault: true,
  },
];
