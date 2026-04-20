export function FearReductionSection() {
  const items = [
    { ikona: "🛡", text: "100% garancia vrátenia do 30 dní — bez otázok" },
    { ikona: "🔒", text: "GDPR compliant · Dáta zostávajú na EU serveroch" },
    { ikona: "⚡", text: "Nasadenie do 1 dňa · Bez IT oddelenia" },
    { ikona: "🤝", text: "Zrušenie kedykoľvek · Bez záväzkov" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.text}
          className="flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-2xl">{item.ikona}</span>
          <p className="text-xs leading-snug" style={{ color: "#94A3B8" }}>{item.text}</p>
        </div>
      ))}
    </div>
  );
}
