"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────
type Row = Record<string, string>;

type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
};

const LEAD_FIELDS: FieldDef[] = [
  { key: "name",         label: "Meno",          required: true },
  { key: "email",        label: "Email" },
  { key: "phone",        label: "Telefón" },
  { key: "location",     label: "Lokalita" },
  { key: "budget",       label: "Rozpočet" },
  { key: "source",       label: "Zdroj" },
  { key: "note",         label: "Poznámka" },
  { key: "propertyType", label: "Typ nehnuteľnosti" },
  { key: "rooms",        label: "Počet izieb" },
  { key: "financing",    label: "Financovanie" },
  { key: "timeline",     label: "Časový horizont" },
];

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if ((ch === "," || ch === ";") && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  }).filter((row) => Object.values(row).some((v) => v.trim()));

  return { headers, rows };
}

// ── Auto-mapping heuristic ─────────────────────────────────────────────────────
function autoMap(headers: string[]): Record<string, string> {
  const HINTS: Record<string, string[]> = {
    name:         ["meno", "name", "klient", "client", "celé meno", "full name"],
    email:        ["email", "e-mail", "mail"],
    phone:        ["telefon", "telefón", "phone", "mobil", "tel"],
    location:     ["lokalita", "location", "mesto", "city", "adresa", "address"],
    budget:       ["rozpočet", "budget", "cena", "price"],
    source:       ["zdroj", "source", "kanál", "channel"],
    note:         ["poznámka", "note", "notes", "komentár", "comment"],
    propertyType: ["typ", "type", "nehnuteľnosť", "property"],
    rooms:        ["izby", "rooms", "izbovost", "izbovosť"],
    financing:    ["financovanie", "financing", "hypotéka"],
    timeline:     ["horizont", "timeline", "kedy", "when"],
  };

  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const h = header.toLowerCase().trim();
    for (const [field, hints] of Object.entries(HINTS)) {
      if (hints.some((hint) => h.includes(hint))) {
        if (!mapping[field]) mapping[field] = header;
        break;
      }
    }
  }
  return mapping;
}

// ── Main component ─────────────────────────────────────────────────────────────
type Step = "upload" | "map" | "preview" | "done";

export default function CsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;

      // Try UTF-8 first; fall back to Windows-1250 (Slovak Excel default)
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("\uFFFD")) {
        try {
          text = new TextDecoder("windows-1250").decode(buffer);
        } catch {
          // windows-1250 not supported in this browser — keep utf-8 result
        }
      }

      const { headers: h, rows: r } = parseCsv(text);
      if (!h.length) { setError("CSV sa nepodarilo načítať. Skontrolujte formát."); return; }
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
      setStep("map");
      setError("");
    };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // Build mapped lead rows from current mapping
  const mapped = rows.map((row) => {
    const lead: Record<string, string> = {};
    for (const [field, col] of Object.entries(mapping)) {
      if (col) lead[field] = row[col] ?? "";
    }
    return lead;
  }).filter((lead) => lead.name?.trim());

  async function runImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: mapped }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Import zlyhal.");
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import zlyhal.");
    } finally {
      setImporting(false);
    }
  }

  // ── STEP: upload ──────────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="space-y-6">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-3xl border-2 border-dashed border-gray-300 bg-white p-16 text-center hover:border-gray-400 transition-colors"
      >
        <div className="text-4xl mb-4">📂</div>
        <p className="text-lg font-semibold text-gray-700">Potiahni CSV sem alebo klikni</p>
        <p className="mt-1 text-sm text-gray-400">Podporuje .csv z Excelu, Google Sheets, exportov z CRM</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Sample CSV hint */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Príklad CSV formátu:</p>
        <pre className="text-xs text-gray-500 overflow-x-auto">Meno,Email,Telefón,Lokalita,Rozpočet,Zdroj
Ján Novák,jan@email.sk,+421 900 111 222,Bratislava,250000,Facebook Ads
Jana Kováčová,jana@email.sk,+421 900 333 444,Trnava,180000,Web formulár</pre>
      </div>
    </div>
  );

  // ── STEP: map ─────────────────────────────────────────────────────────────────
  if (step === "map") return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mapovanie stĺpcov</h2>
            <p className="text-sm text-gray-500">Načítaných {rows.length} riadkov, {headers.length} stĺpcov. Skontroluj mapovanie.</p>
          </div>
          <button
            type="button"
            onClick={() => { setStep("upload"); setError(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Zmeniť súbor
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEAD_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <span className={`w-40 text-sm font-medium shrink-0 ${field.required ? "text-gray-900" : "text-gray-600"}`}>
                {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
              </span>
              <select
                value={mapping[field.key] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="">— nepoužiť —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep("preview")}
          disabled={!mapping.name}
          className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
        >
          Náhľad ({mapped.length} leadov) →
        </button>
        {!mapping.name && <p className="text-sm text-red-500">Musíš namapovať stĺpec Meno.</p>}
      </div>
    </div>
  );

  // ── STEP: preview ─────────────────────────────────────────────────────────────
  if (step === "preview") return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Náhľad importu</h2>
            <p className="text-sm text-gray-500">Importuje sa {mapped.length} leadov. Zobrazených prvých 10.</p>
          </div>
          <button
            type="button"
            onClick={() => setStep("map")}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Späť na mapovanie
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                  <th key={f.key} className="px-4 py-3 font-medium">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mapped.slice(0, 10).map((lead, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                    <td key={f.key} className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {lead[f.key] || <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mapped.length > 10 && (
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            + ďalších {mapped.length - 10} riadkov
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={runImport}
          disabled={importing}
          className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {importing ? "Importujem..." : `Importovať ${mapped.length} leadov`}
        </button>
        <button
          type="button"
          onClick={() => setStep("map")}
          disabled={importing}
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Späť
        </button>
      </div>
    </div>
  );

  // ── STEP: done ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-3xl border border-green-200 bg-green-50 p-10 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-900">Import hotový!</h2>
      <div className="mt-4 flex justify-center gap-8 text-sm">
        <div><span className="font-bold text-2xl text-green-800">{result?.imported ?? 0}</span><br />nových</div>
        <div><span className="font-bold text-2xl text-yellow-700">{result?.updated ?? 0}</span><br />aktualizovaných</div>
        {(result?.errors ?? 0) > 0 && (
          <div><span className="font-bold text-2xl text-red-700">{result?.errors}</span><br />chýb</div>
        )}
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => router.push("/leads")}
          className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Zobraziť leady →
        </button>
        <button
          onClick={() => { setStep("upload"); setResult(null); setRows([]); setHeaders([]); setMapping({}); }}
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Importovať ďalší súbor
        </button>
      </div>
    </div>
  );
}
