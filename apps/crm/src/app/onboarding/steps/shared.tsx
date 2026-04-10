import React from "react";

export function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 w-full md:w-auto transition-all active:scale-95">
      {children}
    </button>
  );
}

export function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all">
      {children}
    </button>
  );
}

export function TagGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const safe = Array.isArray(selected) ? selected : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={"border rounded-full px-4 py-1.5 text-sm transition-all " +
            (safe.includes(opt) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export function OptionCard({ id, emoji, label, desc, active, onClick }: {
  id: string; emoji: string; label: string; desc: string; active: boolean; onClick: (id: string) => void;
}) {
  return (
    <button type="button" onClick={() => onClick(id)}
      className={"border rounded-xl p-4 flex flex-col items-center text-center gap-1 w-full transition-all " +
        (active ? "border-2 border-gray-900 bg-gray-50 scale-[1.02]" : "border border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100")}>
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-sm font-bold text-gray-900">{label}</span>
      {desc && <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>}
    </button>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
        (value ? "bg-blue-600" : "bg-gray-200")}>
      <span className={"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
        (value ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}
