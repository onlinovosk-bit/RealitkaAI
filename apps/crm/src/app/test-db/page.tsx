"use client";

import React, { useState } from "react";

// Card component for options
function OptionCard({ id, label, icon, desc, active, onClick }: {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc?: string;
  active: boolean;
  onClick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`border rounded-lg p-4 flex flex-col items-center min-h-28 w-full text-center focus:outline-none focus:ring-2 focus:ring-gray-900 ${
        active ? "border-2 border-gray-900" : "border-gray-200"
      }`}
      style={{ minHeight: 112 }}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-base font-medium text-gray-900 mb-1">{label}</span>
      {desc && <span className="text-sm text-gray-500">{desc}</span>}
    </button>
  );
}

// ...existing code...

export default function OnboardingPage() {
  // ...implement the full onboarding wizard here, using only allowed Tailwind v4 classes and the exact content/structure from revolisdemo.netlify.app...
  // ...existing code...
}
// CLEAN BASELINE: Remove all framer-motion, AnimatePresence, and broken code. Only valid React and allowed Tailwind v4 classes remain.

// ...existing code...