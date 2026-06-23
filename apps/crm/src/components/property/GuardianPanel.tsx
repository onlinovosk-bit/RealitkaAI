import Link from "next/link";
import type { GuardianPanelView } from "@/lib/capabilities/quality-guardian/panel-map";
import { isGuardianPublishEnabled } from "@/lib/capabilities/quality-guardian/panel-map";

const GUARDIAN_PURPLE = "#8b22ff";
const GUARDIAN_MAGENTA = "#cf25d9";

const STATUS_STYLES = {
  ready: { bg: "rgba(16, 185, 129, 0.12)", color: "#6ee7b7", border: "rgba(16, 185, 129, 0.3)" },
  needs_data: { bg: "rgba(245, 158, 11, 0.12)", color: "#fcd34d", border: "rgba(245, 158, 11, 0.35)" },
  blocked: { bg: "rgba(239, 68, 68, 0.12)", color: "#fca5a5", border: "rgba(239, 68, 68, 0.35)" },
} as const;

export type GuardianPanelProps = {
  view: GuardianPanelView;
  publishFlowAvailable?: boolean;
  /** Keď false (napr. fixture bez DB riadku), CTA edit sa nezobrazí ako aktívny link. */
  propertyEditAvailable?: boolean;
  propertyEditHref?: string;
  listingPreviewHref?: string;
  propertyTitle?: string;
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TodoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function GuardianPanel({
  view,
  publishFlowAvailable = false,
  propertyEditAvailable = true,
  propertyEditHref = "/properties",
  listingPreviewHref = "#listing-preview",
  propertyTitle,
}: GuardianPanelProps) {
  const canPublish = isGuardianPublishEnabled(view);
  const statusStyle = STATUS_STYLES[view.status];

  if (!view.hasOutput) {
    return (
      <section
        className="rounded-2xl border p-6"
        style={{
          background: "linear-gradient(145deg, #12081f 0%, #1a0a2e 100%)",
          borderColor: "rgba(139, 34, 255, 0.25)",
        }}
        data-testid="guardian-panel-empty"
      >
        <h2 className="text-lg font-semibold text-white">Guardian — kontrola pred zverejnením</h2>
        <p className="mt-3 text-sm text-white/60">{view.nextStepSummary}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border p-6"
      style={{
        background: "linear-gradient(145deg, #12081f 0%, #1a0a2e 55%, #0f172a 100%)",
        borderColor: "rgba(139, 34, 255, 0.35)",
        boxShadow: "0 12px 40px rgba(139, 34, 255, 0.12)",
      }}
      data-testid="guardian-panel"
    >
      <div className="mb-4">
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: GUARDIAN_MAGENTA }}
        >
          Guardian
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Kontrola pred zverejnením</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
          {propertyTitle ? (
            <>
              Skontrolujte ponuku <span className="text-white/90">„{propertyTitle}"</span> skôr, než
              ju uvidia kupujúci — AI porovná údaje s textom inzerátu a ukáže, čo doplniť alebo
              opraviť.
            </>
          ) : (
            <>
              Skontrolujte ponuku skôr, než ju uvidia kupujúci — AI porovná údaje s textom inzerátu
              a ukáže, čo doplniť alebo opraviť.
            </>
          )}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span
          className="rounded-full border px-3 py-1 text-sm font-semibold"
          style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            borderColor: statusStyle.border,
          }}
          data-testid="guardian-status-badge"
        >
          {view.statusLabel}
        </span>
        {view.completenessPercent != null && (
          <span className="text-sm text-white/55">
            Úplnosť ponuky:{" "}
            <strong className="tabular-nums text-white">{view.completenessPercent}%</strong>
            <span className="text-white/40">
              {" "}
              ({view.fieldsChecked}/{view.fieldsTotal})
            </span>
          </span>
        )}
      </div>

      <p
        className="mb-5 rounded-xl border px-4 py-3 text-sm leading-relaxed text-white/80"
        style={{ borderColor: "rgba(139, 34, 255, 0.25)", background: "rgba(139, 34, 255, 0.08)" }}
        data-testid="guardian-next-step"
      >
        <span className="font-semibold text-white">Čo teraz: </span>
        {view.nextStepSummary}
      </p>

      {view.completenessPercent != null && (
        <div
          className="mb-6 h-2 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
          role="progressbar"
          aria-valuenow={view.completenessPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${view.completenessPercent}%`,
              background: `linear-gradient(90deg, ${GUARDIAN_PURPLE}, ${GUARDIAN_MAGENTA})`,
            }}
          />
        </div>
      )}

      {view.flags.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
            Opraviť pred odoslaním
          </p>
          <ul className="space-y-2">
            {view.flags.map((flag) => (
              <li
                key={flag.id}
                className="rounded-xl border px-4 py-3"
                style={{
                  background:
                    flag.severity === "blocking"
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(245, 158, 11, 0.08)",
                  borderColor:
                    flag.severity === "blocking"
                      ? "rgba(239, 68, 68, 0.35)"
                      : "rgba(245, 158, 11, 0.3)",
                }}
                data-testid={`guardian-flag-${flag.id}`}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: flag.severity === "blocking" ? "#fca5a5" : "#fcd34d" }}
                >
                  {flag.label}
                </p>
                <p className="mt-1 text-sm text-white/65">{flag.message}</p>
                <p className="mt-2 text-xs font-medium text-amber-200/80">→ {flag.actionLabel}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.todoItems.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
            Doplniť v ponuke ({view.todoItems.length})
          </p>
          <ul className="space-y-2">
            {view.todoItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(245, 158, 11, 0.08)", color: "#fcd34d" }}
                data-testid={`guardian-todo-${item.id}`}
              >
                <span className="mt-0.5 shrink-0">
                  <TodoIcon />
                </span>
                <span>
                  <span className="font-medium text-amber-100">{item.label}</span>
                  <span className="ml-1 text-amber-200/70">· {item.detail}</span>
                  <span className="mt-1 block text-xs text-amber-200/60">→ {item.actionLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.passItems.length > 0 && (
        <details className="mb-5 group">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-white/45 hover:text-white/60">
            V poriadku ({view.passItems.length}) — rozkliknúť
          </summary>
          <ul className="mt-2 space-y-2">
            {view.passItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(16, 185, 129, 0.08)", color: "#6ee7b7" }}
              >
                <span className="mt-0.5 shrink-0">
                  <CheckIcon />
                </span>
                <span>
                  <span className="font-medium text-emerald-100">{item.label}</span>
                  {item.detail ? (
                    <span className="ml-1 text-emerald-200/70">· {item.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <footer
        className="mt-2 rounded-xl border px-4 py-4"
        style={{
          borderColor: "rgba(139, 34, 255, 0.2)",
          background: "rgba(139, 34, 255, 0.06)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Ďalší krok</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {propertyEditAvailable ? (
            <Link
              href={propertyEditHref}
              className="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{
                background: `linear-gradient(90deg, ${GUARDIAN_PURPLE}, ${GUARDIAN_MAGENTA})`,
              }}
              data-testid="guardian-action-edit"
            >
              Upraviť ponuku
            </Link>
          ) : (
            <span
              className="inline-flex flex-1 cursor-not-allowed items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white/50"
              style={{
                background: "rgba(139, 34, 255, 0.15)",
              }}
              data-testid="guardian-action-edit-unavailable"
              title="Ponuka nie je v databáze tejto kancelárie"
            >
              Upraviť ponuku — najprv import
            </span>
          )}
          <Link
            href={listingPreviewHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
            data-testid="guardian-action-preview"
          >
            Pozrieť text inzerátu
          </Link>
        </div>

        {publishFlowAvailable ? (
          <button
            type="button"
            disabled={!canPublish}
            className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              background: canPublish ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
            data-testid="guardian-publish-button"
            aria-disabled={!canPublish}
          >
            {canPublish ? "Potvrdiť a zverejniť" : "Potvrdiť a zverejniť — najprv vyriešte položky vyššie"}
          </button>
        ) : (
          <p className="mt-3 text-xs text-white/45" data-testid="guardian-publish-followup">
            {propertyEditAvailable
              ? "Odoslanie na portál bude dostupné v ďalšej verzii — zatiaľ upravte ponuku a skontrolujte text inzerátu."
              : "Ponuka je zobrazená zo Smolko fixture — úprava bude možná po importe z Realvie do vašej kancelárie."}
          </p>
        )}
      </footer>
    </section>
  );
}
