"use client";

import { useState, useEffect } from "react";


type Option = { id: string; name: string };
// TODO: Replace with real data loading from assets/DB
const fetchSegments = async (): Promise<Option[]> => [
  { id: "seg1", name: "Segment 1" },
  { id: "seg2", name: "Segment 2" },
];
const fetchTemplates = async (): Promise<Option[]> => [
  { id: "tmpl1", name: "Cold Email 1" },
  { id: "tmpl2", name: "Cold Email 2" },
];


export default function CampaignBuilder() {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [template, setTemplate] = useState("");
  const [segments, setSegments] = useState<Option[]>([]);
  const [templates, setTemplates] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSegments().then((data) => setSegments(data));
    fetchTemplates().then((data) => setTemplates(data));
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    // TODO: Save campaign logic
    setTimeout(() => {
      setSaving(false);
      setMessage("Kampaň bola uložená.");
    }, 1000);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm max-w-xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Vytvoriť novú kampaň</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Názov kampane</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            placeholder="Názov kampane"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Segment</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Vyber segment</option>
            {segments.map((seg) => (
              <option key={seg.id} value={seg.id}>{seg.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Šablóna emailu</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Vyber šablónu</option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? "Ukladám..." : "Uložiť a spustiť kampaň"}
        </button>
        {message && (
          <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>
        )}
      </form>
    </div>
  );
}
