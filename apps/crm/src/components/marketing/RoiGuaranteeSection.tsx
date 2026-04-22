"use client";
import { useState, useCallback } from "react";
import { Shield, CheckCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

const GUARANTEES = [
  "Ak AI Asistent nepomôže uzatvoriť aspoň 1 obchod navyše za 30 dní",
  "Vrátime 100% zaplatenej sumy bez otázok",
  "Stačí napísať dôvod – zvyšok riešime my",
];

export default function RoiGuaranteeSection() {
  const [showForm, setShowForm]   = useState(false);
  const [email, setEmail]         = useState("");
  const [agency, setAgency]       = useState("");
  const [reason, setReason]       = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!email || !reason) {
      setErrorMsg("Email a dôvod sú povinné.");
      return;
    }
    setErrorMsg(null);
    setFormState("submitting");

    try {
      const res = await fetch("/api/guarantee/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          agencyName: agency,
          plan: "pro",
          claimReason: reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Chyba servera.");
      }

      setFormState("success");

      if (typeof window !== "undefined" &&
          typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag(
          "event", "roi_guarantee_claimed", { plan: "pro" }
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Neznáma chyba.");
      setFormState("error");
    }
  }, [email, agency, reason]);

  return (
    <section
      className="rounded-3xl p-8 md:p-10 my-12"
      style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(52,211,153,0.06) 100%)",
        border: "1px solid rgba(34,211,238,0.15)",
      }}
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(34,211,238,0.10)", border: "1px solid rgba(34,211,238,0.20)" }}
        >
          <Shield size={22} style={{ color: "#22D3EE" }} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white mb-1">
            100% ROI Garancia
          </h2>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Ak nie ste spokojní do 30 dní – vrátime každý cent + 50€ navyše.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {GUARANTEES.map((g, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle
              size={14}
              className="flex-shrink-0 mt-0.5"
              style={{ color: "#34D399" }}
            />
            <span className="text-sm" style={{ color: "#94A3B8" }}>{g}</span>
          </div>
        ))}
      </div>

      {!showForm && formState !== "success" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #22D3EE, #34D399)",
              color: "#050914",
            }}
          >
            Uplatniť garanciu
          </button>
          <p className="text-xs" style={{ color: "#334155" }}>
            Platí pre prvých 30 dní od aktivácie plánu.
          </p>
        </div>
      )}

      {showForm && formState !== "success" && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(0,0,0,0.20)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="text-sm font-bold text-white">Žiadosť o vrátenie</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                style={{ color: "#64748B" }}
              >
                Váš email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.sk"
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#F0F9FF",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                style={{ color: "#64748B" }}
              >
                Názov kancelárie
              </label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="Napr. ABC Reality"
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#F0F9FF",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: "#64748B" }}
            >
              Dôvod žiadosti *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Popíšte prečo Revolis.AI nesplnil očakávania..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#F0F9FF",
                outline: "none",
              }}
            />
          </div>

          {errorMsg && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "rgba(239,68,68,0.08)", color: "#FCA5A5" }}
            >
              ⚠ {errorMsg}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void handleSubmit()}
              disabled={formState === "submitting"}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-60"
              style={{ background: "#22D3EE", color: "#050914" }}
            >
              {formState === "submitting" && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Odoslať žiadosť
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 rounded-xl text-sm transition-all hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {formState === "success" && (
        <div
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}
        >
          <CheckCircle size={18} style={{ color: "#34D399" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#34D399" }}>
              Žiadosť prijatá
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
              Odpíšeme do 5 pracovných dní na váš email.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
