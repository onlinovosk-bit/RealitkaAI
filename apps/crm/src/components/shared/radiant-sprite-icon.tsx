"use client";

export type RadiantIconKey =
  | "dashboard"
  | "playbook"
  | "revolis-ai"
  | "leads"
  | "tasks"
  | "pipeline"
  | "properties"
  | "import"
  | "billing"
  | "settings";

const ICON_STYLES: Record<
  RadiantIconKey,
  { image: string; size: string; x: string; y: string }
> = {
  dashboard: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "0%", y: "0%" },
  playbook: { image: "/radiant-chapters-icons.png", size: "300% 100%", x: "0%", y: "0%" },
  "revolis-ai": { image: "/radiant-chapters-icons.png", size: "300% 100%", x: "50%", y: "0%" },
  leads: { image: "/radiant-chapters-icons.png", size: "300% 100%", x: "100%", y: "0%" },
  tasks: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "67%", y: "0%" },
  pipeline: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "100%", y: "0%" },
  properties: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "0%", y: "100%" },
  import: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "33%", y: "100%" },
  billing: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "67%", y: "100%" },
  settings: { image: "/radiant-menu-icons.png", size: "400% 200%", x: "100%", y: "100%" },
};

export function RadiantSpriteIcon({
  icon,
  sizeClassName = "h-11 w-11",
  className = "",
}: {
  icon: RadiantIconKey;
  sizeClassName?: string;
  className?: string;
}) {
  const styleMap = ICON_STYLES[icon];

  return (
    <span
      className={`inline-block ${sizeClassName} shrink-0 rounded-xl border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.30)] ${className}`.trim()}
      style={{
        backgroundImage: `url('${styleMap.image}')`,
        backgroundSize: styleMap.size,
        backgroundPosition: `${styleMap.x} ${styleMap.y}`,
        backgroundRepeat: "no-repeat",
        backgroundOrigin: "content-box",
        padding: "2px",
      }}
      aria-hidden
    />
  );
}
