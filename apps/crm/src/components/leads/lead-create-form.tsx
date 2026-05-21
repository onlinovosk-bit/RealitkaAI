"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sourceOptions } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_INPUT, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

const initialState = {
  name: "",
  email: "",
  phone: "",
  source: "Web formulár",
  note: "",
};

export default function LeadCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) return;
    if (!form.email.trim() && !form.phone.trim()) {
      showToast("Zadaj aspoň email alebo telefón.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // defaults for required backend fields
          location: "",
          budget: "",
          propertyType: "Byt",
          rooms: "2 izby",
          financing: "Hypotéka",
          timeline: "Do 3 mesiacov",
          status: "Nový",
          score: 50,
          assignedAgent: "Nepriradený",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Chyba");

      setForm(initialState);
      setIsOpen(false);
      showToast("✓ Príležitosť uložená");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nepodarilo sa uložiť príležitosť.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors";
  const inputStyle = {
    background: WORKDESK_INPUT.background,
    borderColor: WORKDESK_INPUT.borderColor,
    color: WORKDESK_INPUT.color,
  };

  return (
    <div className="relative">
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
          style={{
            background: WORKDESK_PANEL.background,
            borderColor: WORKDESK_PANEL.borderColor,
            color: SLATE_HORIZON.ink,
            boxShadow: WORKDESK_PANEL.boxShadow,
          }}
        >
          {toast}
        </div>
      )}

      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900" style={{ color: SLATE_HORIZON.ink }}>Pridať príležitosť</h2>
            <p className="text-xs mt-0.5" style={{ color: SLATE_HORIZON.muted }}>Uložená do 10 sekúnd.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="rounded-xl px-4 py-2 text-sm font-semibold min-h-[40px] transition-all active:scale-95"
            style={
              isOpen
                ? {
                    background: SLATE_HORIZON.bg,
                    color: SLATE_HORIZON.muted,
                    border: `1px solid ${WORKDESK_INPUT.borderColor}`,
                  }
                : {
                    background: `linear-gradient(135deg, ${SLATE_HORIZON.brandDeep}, ${SLATE_HORIZON.brand})`,
                    color: "#FFFFFF",
                  }
            }
          >
            {isOpen ? "Zavrieť" : "+ Nová"}
          </button>
        </div>

        {isOpen && (
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>
                Meno <span style={{ color: SLATE_HORIZON.red }}>*</span>
              </label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Ján Novák"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="jan@email.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>Telefón</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                placeholder="+421 9XX XXX XXX"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>Zdroj</label>
              <select
                value={form.source}
                onChange={e => update("source", e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {sourceOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium" style={{ color: SLATE_HORIZON.muted }}>Poznámka</label>
              <textarea
                value={form.note}
                onChange={e => update("note", e.target.value)}
                rows={2}
                placeholder="Záujem o 3-izbový byt v Ružinove..."
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none rounded-xl px-5 py-2.5 text-sm font-semibold min-h-[44px] transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${SLATE_HORIZON.brandDeep}, ${SLATE_HORIZON.brand})`,
                  color: "#FFFFFF",
                }}
              >
                {isSaving ? "Ukladám..." : "Pridať príležitosť"}
              </button>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setForm(initialState); }}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium min-h-[44px]"
                style={{ borderColor: WORKDESK_INPUT.borderColor, color: SLATE_HORIZON.muted }}
              >
                Zrušiť
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
