// src/pages/DashboardPage.jsx
// Main landing screen after login: create new quote or pick a template

import React, { useState } from "react";

export default function DashboardPage({
  user,
  templates,
  onNewQuote,
  onSelectTemplate,
  onDeleteTemplate,
  onLogout,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const defaultTemplates = templates.filter((t) => t.isDefault);
  const customTemplates = templates.filter((t) => !t.isDefault);

  const handleDelete = async (id) => {
    await onDeleteTemplate(id);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-body">
      {/* Top Nav */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <span className="font-display text-white text-xl font-bold uppercase tracking-wide">
            PlumbQuote
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero CTA */}
        <button
          onClick={onNewQuote}
          className="w-full bg-rust-500 hover:bg-rust-600 active:scale-98 text-white font-display font-bold text-2xl uppercase tracking-wide py-6 rounded-2xl shadow-lg shadow-rust-500/20 transition-all duration-150 flex items-center justify-center gap-3 mb-8"
        >
          <span className="text-3xl">+</span>
          Create New Quote
        </button>

        {/* Default Templates */}
        <section className="mb-6">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Job Templates
          </h2>
          <div className="space-y-2">
            {defaultTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={() => onSelectTemplate(t)}
                onDelete={null} // Default templates can't be deleted
              />
            ))}
          </div>
        </section>

        {/* Custom Templates */}
        {customTemplates.length > 0 && (
          <section className="mb-6">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
              My Saved Templates
            </h2>
            <div className="space-y-2">
              {customTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => onSelectTemplate(t)}
                  onDelete={() => setConfirmDelete(t.id)}
                />
              ))}
            </div>
          </section>
        )}

        {templates.length === 0 && (
          <p className="text-center text-slate-500 py-8">
            Loading templates...
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-xs w-full border border-slate-700 shadow-2xl">
            <h3 className="text-white font-display font-bold text-xl mb-2 uppercase">
              Delete Template?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Template Card ──────────────────────────────────────
function TemplateCard({ template, onClick, onDelete }) {
  return (
    <div className="bg-slate-800 hover:bg-slate-750 rounded-xl border border-slate-700 overflow-hidden transition-colors group">
      <div className="flex items-center">
        <button
          onClick={onClick}
          className="flex-1 flex items-center gap-4 px-4 py-4 text-left"
        >
          <span className="text-2xl">{template.icon || "📋"}</span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-base leading-tight">
              {template.name}
            </div>
            <div className="text-slate-400 text-sm mt-0.5 truncate">
              {template.description || `${template.laborHours}h labor`}
            </div>
          </div>
          <div className="text-slate-400 text-sm">→</div>
        </button>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-4 py-4 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete template"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
