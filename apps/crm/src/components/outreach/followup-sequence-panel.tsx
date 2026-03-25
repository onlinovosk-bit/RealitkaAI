"use client";

import { useState, useEffect } from "react";

// TODO: Replace with real data loading from followups.md
const fetchFollowups = async () => [
  { id: "fup1", name: "Follow-up 1", content: "Pripomienka po 2 dňoch" },
  { id: "fup2", name: "Follow-up 2", content: "Druhá pripomienka po 5 dňoch" },
  { id: "fup3", name: "Follow-up 3", content: "Záverečný follow-up po 10 dňoch" },
];

export default function FollowupSequencePanel() {
  const [followups, setFollowups] = useState([]);

  useEffect(() => {
    fetchFollowups().then(setFollowups);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm max-w-xl mx-auto mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Follow-up sekvencie</h2>
      <ol className="list-decimal pl-5 space-y-2">
        {followups.map((fup) => (
          <li key={fup.id} className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-800">{fup.name}</div>
            <div className="text-sm text-gray-600">{fup.content}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
