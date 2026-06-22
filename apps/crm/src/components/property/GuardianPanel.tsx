import type { GuardianPanelView } from "@/lib/capabilities/quality-guardian/panel-map";
import { isGuardianPublishEnabled } from "@/lib/capabilities/quality-guardian/panel-map";

const GUARDIAN_PURPLE = "#8b22ff";
const GUARDIAN_MAGENTA = "#cf25d9";

export type GuardianPanelProps = {
  view: GuardianPanelView;
  /** When false, publish button shows follow-up warning (no publish flow wired yet). */
  publishFlowAvailable?: boolean;
};

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

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

export default function GuardianPanel({ view, publishFlowAvailable = false }: GuardianPanelProps) {
  const canPublish = isGuardianPublishEnabled(view);
  const buttonDisabled = !canPublish || !publishFlowAvailable;

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
        <h2 className="text-lg font-semibold text-white">Guardian — kontrola kvality</h2>
        <p className="mt-3 text-sm text-white/60">Kontrola ešte neprebehla.</p>
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: GUARDIAN_MAGENTA }}
          >
            Guardian
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Kontrola kvality</h2>
        </div>
        {view.completenessPercent != null && (
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-white">{view.completenessPercent}%</p>
            <p className="text-xs text-white/50">
              {view.fieldsChecked}/{view.fieldsTotal} polí
            </p>
          </div>
        )}
      </div>

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

      {view.passItems.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Pass</p>
          <ul className="space-y-2">
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
        </div>
      )}

      {view.flags.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Flag</p>
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
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer
        className="mt-6 rounded-xl border px-4 py-4"
        style={{
          borderColor: "rgba(139, 34, 255, 0.2)",
          background: "rgba(139, 34, 255, 0.06)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          {!canPublish && (
            <span className="inline-flex items-center gap-1 text-amber-300/90">
              <LockIcon />
              Zablokované
            </span>
          )}
          <span>AI pripravila. Ty potvrdíš. Von to nejde bez teba.</span>
        </div>

        {!publishFlowAvailable && (
          <p className="mt-2 text-xs text-white/45" data-testid="guardian-publish-followup">
            Publish flow zatiaľ nie je pripojený — brána je len vizuálna kontrola (follow-up).
          </p>
        )}

        <button
          type="button"
          disabled={buttonDisabled}
          className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            background: canPublish
              ? `linear-gradient(90deg, ${GUARDIAN_PURPLE}, ${GUARDIAN_MAGENTA})`
              : "rgba(255,255,255,0.08)",
            color: "#fff",
          }}
          data-testid="guardian-publish-button"
          aria-disabled={buttonDisabled}
        >
          {canPublish ? "Potvrdiť a zverejniť" : "Potvrdiť a zverejniť — vyriešte FLAG"}
        </button>
      </footer>
    </section>
  );
}
