// src/App.js
// Top-level app: handles auth state, page routing, and data flow
// Navigation is simple state-based (no react-router needed for this scale)

import React, { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTemplates } from "./hooks/useTemplates";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import QuoteBuilderPage from "./pages/QuoteBuilderPage";

// Page names used for routing
const PAGES = {
  DASHBOARD: "dashboard",
  QUOTE_BUILDER: "quote_builder",
};

export default function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { templates, saveTemplate, deleteTemplate } = useTemplates(user?.uid);
  const [page, setPage] = useState(PAGES.DASHBOARD);
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Loading spinner while Firebase auth initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 font-body animate-pulse text-lg">
          Loading...
        </div>
      </div>
    );
  }

  // Not signed in: show login
  if (!user) {
    return <LoginPage onSignIn={signInWithGoogle} />;
  }

  // ── Quote Builder ────────────────────────────────────
  if (page === PAGES.QUOTE_BUILDER) {
    return (
      <QuoteBuilderPage
        template={activeTemplate}
        onSaveTemplate={async (t) => {
          const saved = await saveTemplate(t);
          return saved;
        }}
        onBack={() => {
          setPage(PAGES.DASHBOARD);
          setActiveTemplate(null);
        }}
      />
    );
  }

  // ── Dashboard ────────────────────────────────────────
  return (
    <DashboardPage
      user={user}
      templates={templates}
        setActiveTemplate(null);
        setPage(PAGES.QUOTE_BUILDER);
      }}
      onSelectTemplate={(template) => {
        setActiveTemplate(template);
        setPage(PAGES.QUOTE_BUILDER);
      }}
      onDeleteTemplate={deleteTemplate}
      onLogout={logout}
    />
    <div style={{ background: "red", color: "white", height: "100vh" }}>
      <h1>WORKING</h1>
    </div>
  );
}
  return <h1>WORKING</h1>;
