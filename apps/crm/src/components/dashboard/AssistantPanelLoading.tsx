import { SLATE_HORIZON, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

export function AssistantPanelLoading() {
  return (
    <div
      className="rounded-[20px] border p-5 animate-pulse"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="h-5 w-36 rounded" style={{ background: SLATE_HORIZON.soft }} />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded" style={{ background: SLATE_HORIZON.soft }} />
        <div className="h-3 w-4/5 rounded" style={{ background: SLATE_HORIZON.soft }} />
        <div className="h-3 w-2/3 rounded" style={{ background: SLATE_HORIZON.soft }} />
      </div>
    </div>
  );
}
