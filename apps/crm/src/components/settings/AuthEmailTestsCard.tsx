"use client";

import { useEffect, useState } from "react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type AsyncState = "idle" | "loading" | "success" | "error";

export function AuthEmailTestsCard() {
  const [myEmail, setMyEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLink, setRecoveryLink] = useState("");
  const [testInviteEmail, setTestInviteEmail] = useState("");
  const [testInviteName, setTestInviteName] = useState("Testovací maklér");

  const [recoveryState, setRecoveryState] = useState<AsyncState>("idle");
  const [inviteState, setInviteState] = useState<AsyncState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/auth-email-tests")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setMyEmail(d.email ?? "");
          setRecoveryEmail(d.email ?? "");
        }
      })
      .catch(() => {
        // Non-blocking: card stays usable for invite flow.
      });
  }, []);

  async function sendRecovery() {
    setRecoveryState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/settings/auth-email-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recovery", email: recoveryEmail }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Recovery e-mail sa nepodarilo odoslať.");
      setRecoveryState("success");
      setMessage(data.message ?? "Recovery e-mail bol odoslaný.");
    } catch (err) {
      setRecoveryState("error");
      setMessage(err instanceof Error ? err.message : "Recovery e-mail sa nepodarilo odoslať.");
    }
  }

  async function createRecoveryLink() {
    setRecoveryState("loading");
    setRecoveryLink("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/auth-email-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recovery-link", email: recoveryEmail }),
      });
      const data = await res.json();
      if (!data.ok || !data.recoveryLink) throw new Error(data.error ?? "Odkaz sa nepodarilo vytvoriť.");
      setRecoveryLink(data.recoveryLink);
      setRecoveryState("success");
      setMessage(data.message ?? "Odkaz na reset hesla je pripravený.");
    } catch (err) {
      setRecoveryState("error");
      setMessage(err instanceof Error ? err.message : "Odkaz sa nepodarilo vytvoriť.");
    }
  }

  async function copyRecoveryLink() {
    await navigator.clipboard.writeText(recoveryLink);
    setMessage("Odkaz bol skopírovaný. Môžeš ho poslať používateľovi.");
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/settings/auth-email-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          email: testInviteEmail,
          fullName: testInviteName,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Pozvánku sa nepodarilo odoslať.");
      setInviteState("success");
      setMessage(data.message ?? "Pozvánka bola odoslaná.");
    } catch (err) {
      setInviteState("error");
      setMessage(err instanceof Error ? err.message : "Pozvánku sa nepodarilo odoslať.");
    }
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="border-b p-4 md:p-6" style={{ borderColor: WORKDESK_CARD.borderColor }}>
        <h3 className="text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Auth e-mail testy
        </h3>
        <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Interné testy pre onboarding (B1): recovery na vlastný účet + invite na testovací e-mail.
          Šablóny a SMTP:{" "}
          <a
            href="https://github.com/onlinovosk-bit/RealitkaAI/blob/main/docs/runbooks/supabase-auth-email-templates-sk.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            runbook supabase-auth-email-templates-sk
          </a>
          . Pass = SMTP test + recovery + invite s telom e-mailu.
        </p>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        <div className="rounded-xl border p-4" style={{ borderColor: WORKDESK_CARD.borderColor }}>
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            Reset hesla používateľa
          </p>
          <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Zadaj e-mail používateľa. Pošli mu recovery e-mail alebo vytvor odkaz, ktorý mu odošleš sám.
          </p>
          <label className="mt-3 block text-xs" style={{ color: SLATE_HORIZON.muted }}>
            E-mail používateľa
            <input
              required
              type="email"
              value={recoveryEmail}
              onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryLink(""); }}
              placeholder={myEmail || "pouzivatel@realitka.sk"}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: WORKDESK_CARD.borderColor, color: SLATE_HORIZON.ink, background: "white" }}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={sendRecovery} disabled={recoveryState === "loading" || !recoveryEmail} className="rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px]" style={{ background: SLATE_HORIZON.brandDeep, color: "white", opacity: recoveryState === "loading" ? 0.6 : 1 }}>
              {recoveryState === "loading" ? "Pracujem..." : "Odoslať reset e-mail"}
            </button>
            <button type="button" onClick={createRecoveryLink} disabled={recoveryState === "loading" || !recoveryEmail} className="rounded-xl border px-4 py-2.5 text-sm font-bold min-h-[44px]" style={{ borderColor: SLATE_HORIZON.softBorder, color: SLATE_HORIZON.brandDeep, background: SLATE_HORIZON.soft }}>
              Vytvoriť odkaz na reset hesla
            </button>
          </div>
          {recoveryLink && (
            <div className="mt-3 rounded-lg border p-3" style={{ borderColor: WORKDESK_CARD.borderColor, background: "#f8fafc" }}>
              <p className="text-xs font-semibold" style={{ color: SLATE_HORIZON.ink }}>Vytvorený odkaz na resetovanie hesla</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input readOnly value={recoveryLink} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-xs" />
                <button type="button" onClick={copyRecoveryLink} className="rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ background: SLATE_HORIZON.brandDeep }}>Kopírovať odkaz</button>
              </div>
              <p className="mt-2 text-xs text-amber-700">Odkaz je jednorazový a citlivý. Pošli ho iba konkrétnemu používateľovi.</p>
            </div>
          )}
        </div>

        <form
          onSubmit={sendInvite}
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: WORKDESK_CARD.borderColor }}
        >
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            Invite na testovací e-mail
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
              Meno test používateľa
              <input
                required
                value={testInviteName}
                onChange={(e) => setTestInviteName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: WORKDESK_CARD.borderColor, color: SLATE_HORIZON.ink, background: "white" }}
              />
            </label>
            <label className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
              Testovací e-mail
              <input
                required
                type="email"
                value={testInviteEmail}
                onChange={(e) => setTestInviteEmail(e.target.value)}
                placeholder="test+invite@..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: WORKDESK_CARD.borderColor, color: SLATE_HORIZON.ink, background: "white" }}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={inviteState === "loading"}
            className="rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px]"
            style={{
              background: SLATE_HORIZON.soft,
              border: `1px solid ${SLATE_HORIZON.softBorder}`,
              color: SLATE_HORIZON.brandDeep,
              opacity: inviteState === "loading" ? 0.6 : 1,
              cursor: inviteState === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {inviteState === "loading" ? "Odosielam..." : "Poslať test invite"}
          </button>
        </form>

        {message && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor:
                recoveryState === "error" || inviteState === "error"
                  ? "#fecaca"
                  : "#bbf7d0",
              background:
                recoveryState === "error" || inviteState === "error"
                  ? "#fef2f2"
                  : "#f0fdf4",
              color:
                recoveryState === "error" || inviteState === "error"
                  ? "#991b1b"
                  : "#166534",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
