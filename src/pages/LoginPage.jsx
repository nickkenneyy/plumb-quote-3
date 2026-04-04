// src/pages/LoginPage.jsx
// Simple Google sign-in screen

import React from "react";

export default function LoginPage({ onSignIn }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="font-display text-5xl font-bold text-white tracking-tight uppercase">
          PlumbQuote
        </h1>
        <p className="mt-2 text-slate-400 font-body text-lg">
          Fast, accurate estimates for plumbers
        </p>
      </div>

      {/* Sign-in card */}
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-slate-700">
        <h2 className="font-display text-2xl text-white font-bold mb-2 uppercase tracking-wide">
          Get Started
        </h2>
        <p className="text-slate-400 font-body mb-8 text-sm">
          Sign in to create and save job estimates in under 2 minutes.
        </p>

        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-body font-semibold py-4 px-6 rounded-xl text-base transition-all duration-150 active:scale-95 shadow-md"
        >
          {/* Google icon */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-slate-500 text-xs font-body mt-6">
          Your quotes are saved securely to your account
        </p>
      </div>

      {/* Feature bullets */}
      <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { icon: "⚡", label: "2-min quotes" },
          { icon: "💰", label: "Profit alerts" },
          { icon: "📄", label: "PDF export" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50"
          >
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-slate-400 text-xs font-body">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
