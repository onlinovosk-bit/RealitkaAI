"use client";

import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import type { Lead } from "@/lib/leads-store";

type Props = {
  leads: Lead[];
};

export function WorkdeskCommandHero({ leads }: Props) {
  return (
    <section
      className="workdesk-command-hero relative mb-5 overflow-hidden rounded-[22px] p-7 text-white md:p-8"
      style={{
        background: SLATE_HORIZON.heroGradient,
        boxShadow: "0 24px 56px rgba(8,17,32,0.32)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: SLATE_HORIZON.heroAmbient }}
        aria-hidden
      />
      <div
        className="workdesk-hero-glow pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "rgba(96,165,250,0.22)" }}
        aria-hidden
      />

      <div className="relative z-[1]">
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
          style={{
            background: "rgba(239,246,255,0.18)",
            color: "#EFF6FF",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          AI REVENUE OPERATING SYSTEM
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-[1.05]">
          Kde mám peniaze dnes?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/82">
          Revolis neukazuje dáta — vedie ťa ku krokom, ktoré najrýchliejšie posunú obchod k provízii.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["AI Priority Strip", "Lost Revenue Radar", "Call Order AI", "Owner Pressure View"].map((chip) => (
            <span
              key={chip}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {leads.slice(0, 3).map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl p-3.5 backdrop-blur-[2px]"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <b className="block text-sm font-bold">
                {lead.name}
                {lead.budget ? (
                  <>
                    {" · "}
                    <span style={{ color: "#86efac" }}>
                      €{Math.round(lead.budget * 0.03).toLocaleString("sk-SK")}
                    </span>
                  </>
                ) : null}
              </b>
              <span className="text-xs text-white/75">
                {lead.score}% istota · {lead.status === "Horúci" ? "volať do 15 min" : "posunúť pipeline"}
              </span>
            </div>
          ))}
          {leads.length === 0 && (
            <>
              <PriorityPlaceholder name="Lucia Šimko · €7 200" detail="91% istota · volať do 15 min" money />
              <PriorityPlaceholder name="Lukáš Nagy · hypotéka OK" detail="87% · posunúť pipeline" />
              <PriorityPlaceholder name="Jana Horváth · obhliadka" detail="78% · poslať SMS dnes" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PriorityPlaceholder({
  name,
  detail,
  money,
}: {
  name: string;
  detail: string;
  money?: boolean;
}) {
  const [label, value] = money ? name.split(" · ") : [name, null];
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <b className="block text-sm font-bold">
        {value ? (
          <>
            {label} · <span style={{ color: "#86efac" }}>{value}</span>
          </>
        ) : (
          name
        )}
      </b>
      <span className="text-xs text-white/75">{detail}</span>
    </div>
  );
}
