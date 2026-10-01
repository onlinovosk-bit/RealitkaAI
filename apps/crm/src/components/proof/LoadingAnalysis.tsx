"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const MESSAGES = [
  "Počítame váš odhad z trhových benchmarkov…",
  "Porovnávame čas odpovede so slovenským trhom…",
  "Odhadujeme únik pri vašom objeme dopytov…",
  "Skladáme Revenue Health Index…",
  "Hotovo — pripravujeme prehľad.",
];

type LoadingAnalysisProps = {
  onDone: () => void;
};

export default function LoadingAnalysis({ onDone }: LoadingAnalysisProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 4200;
    const msgInterval = totalDuration / (MESSAGES.length - 1);

    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => {
        if (prev >= MESSAGES.length - 1) {
          clearInterval(msgTimer);
          return prev;
        }
        return prev + 1;
      });
    }, msgInterval);

    const progTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progTimer);
          return 100;
        }
        return prev + 100 / (totalDuration / 50);
      });
    }, 50);

    const doneTimer = setTimeout(() => onDone(), totalDuration + 200);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className="rounded-3xl border p-8 text-center"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: SLATE_HORIZON.softBorder,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="mx-auto mb-5 h-2 max-w-md overflow-hidden rounded-full" style={{ background: SLATE_HORIZON.line }}>
        <motion.div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, background: SLATE_HORIZON.brandDeep }}
        />
      </div>
      <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
