import { Handshake, Lock, Shield, Zap } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const items = [
  { Icon: Shield, text: "100% garancia vrátenia do 30 dní — bez otázok" },
  { Icon: Lock, text: "GDPR compliant · Dáta zostávajú na EU serveroch" },
  { Icon: Zap, text: "Nasadenie do 1 dňa · Bez IT oddelenia" },
  { Icon: Handshake, text: "Zrušenie kedykoľvek · Bez záväzkov" },
];

export function FearReductionSection() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ Icon, text }) => (
        <div
          key={text}
          className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: SLATE_HORIZON.line,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: SLATE_HORIZON.brandDeep }} aria-hidden />
          <p className="text-xs leading-snug" style={{ color: SLATE_HORIZON.deep }}>
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}
