"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TARGET_FIELD_OPTIONS } from "@/lib/universal-import/field-labels";
import type {
  ColumnMapping,
  DetectedColumn,
  ImportReport,
  ImportSourceSystem,
  MappedContact,
} from "@/lib/universal-import/types";
import { SOURCE_SYSTEM_LABELS } from "@/lib/universal-import/types";

type Step = "upload" | "mapping" | "preview" | "done";

const SOURCE_OPTIONS = Object.entries(SOURCE_SYSTEM_LABELS) as Array<
  [ImportSourceSystem, string]
>;

export default function UniversalImportWizard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [sourceSystem, setSourceSystem] = useState<ImportSourceSystem>("realvia");
  const [jobId, setJobId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [previewRows, setPreviewRows] = useState<MappedContact[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sourceSystem", sourceSystem);

      const res = await fetch("/api/universal-import/start", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload zlyhal.");

      setJobId(data.jobId);
      setFileName(file.name);
      setTotalRows(data.totalRows);
      setDetectedColumns(data.detectedColumns ?? []);
      setColumnMapping(data.suggestedMapping ?? {});
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload zlyhal.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmMapping() {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/universal-import/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, columnMapping, mappingSource: "manual" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Uloženie mapovania zlyhalo.");

      const previewRes = await fetch(`/api/universal-import/preview?jobId=${jobId}`);
      const previewData = await previewRes.json();
      if (!previewRes.ok || !previewData.ok) {
        throw new Error(previewData.error ?? "Náhľad zlyhal.");
      }

      setPreviewRows(previewData.preview ?? []);
      setWarnings(previewData.warnings ?? []);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mapovanie zlyhalo.");
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/universal-import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Import zlyhal.");

      setReport(data.report);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import zlyhal.");
    } finally {
      setLoading(false);
    }
  }

  const hasNameMapping = Object.values(columnMapping).includes("contact_name");

  if (step === "upload") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zdrojový CRM systém
          </label>
          <select
            value={sourceSystem}
            onChange={(e) => setSourceSystem(e.target.value as ImportSourceSystem)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {SOURCE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void handleUpload(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-3xl border-2 border-dashed border-gray-300 bg-white p-16 text-center hover:border-gray-400 transition-colors"
        >
          <div className="text-4xl mb-4">📂</div>
          <p className="text-lg font-semibold text-gray-700">Potiahni CSV sem alebo klikni</p>
          <p className="mt-1 text-sm text-gray-400">
            Realvia, RealSoft, Google Kontakty, Excel exporty a ďalšie
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>

        {loading && <p className="text-sm text-gray-500">Načítavam a detekujem stĺpce…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mapovanie stĺpcov</h2>
              <p className="text-sm text-gray-500">
                {fileName} · {totalRows} riadkov · {detectedColumns.length} stĺpcov
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setError("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Zmeniť súbor
            </button>
          </div>

          <div className="space-y-3">
            {detectedColumns.map((col) => (
              <div
                key={col.originalHeader}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_1fr] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{col.originalHeader}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {col.sampleValues.join(" · ") || "—"}
                  </p>
                </div>
                <select
                  value={columnMapping[col.originalHeader] ?? "skip"}
                  onChange={(e) =>
                    setColumnMapping((m) => ({
                      ...m,
                      [col.originalHeader]: e.target.value as ColumnMapping[string],
                    }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                >
                  {TARGET_FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {col.target !== "skip" && col.confidence >= 0.8
                    ? `Auto: ${Math.round(col.confidence * 100)} %`
                    : "Manuálne"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void confirmMapping()}
            disabled={loading || !hasNameMapping}
            className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {loading ? "Ukladám…" : "Náhľad →"}
          </button>
          {!hasNameMapping && (
            <p className="text-sm text-red-500">Namapuj aspoň jeden stĺpec na Meno.</p>
          )}
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Náhľad importu</h2>
              <p className="text-sm text-gray-500">
                Importuje sa až {totalRows} kontaktov. Zobrazených prvých {previewRows.length}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("mapping")}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Späť na mapovanie
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Meno</th>
                  <th className="px-4 py-3 font-medium">Telefón</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Adresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.contact_name}</td>
                    <td className="px-4 py-3">{row.phone || "—"}</td>
                    <td className="px-4 py-3">{row.email || "—"}</td>
                    <td className="px-4 py-3">{row.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={loading}
            className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Importujem…" : `Importovať ${totalRows} kontaktov`}
          </button>
          <button
            type="button"
            onClick={() => setStep("mapping")}
            disabled={loading}
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Späť
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-green-200 bg-green-50 p-10 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-900">Import hotový!</h2>
      <div className="mt-4 flex justify-center gap-8 text-sm">
        <div>
          <span className="font-bold text-2xl text-green-800">{report?.importedRows ?? 0}</span>
          <br />
          nových
        </div>
        <div>
          <span className="font-bold text-2xl text-yellow-700">{report?.duplicateRows ?? 0}</span>
          <br />
          duplikátov
        </div>
        <div>
          <span className="font-bold text-2xl text-gray-700">{report?.skippedRows ?? 0}</span>
          <br />
          preskočených
        </div>
        {(report?.errorRows ?? 0) > 0 && (
          <div>
            <span className="font-bold text-2xl text-red-700">{report?.errorRows}</span>
            <br />
            chýb
          </div>
        )}
      </div>
      {report?.timeToComplete && (
        <p className="mt-3 text-sm text-green-800">Trvanie: {report.timeToComplete}</p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => router.push("/leads")}
          className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Zobraziť leady →
        </button>
        <button
          onClick={() => {
            setStep("upload");
            setReport(null);
            setJobId(null);
            setDetectedColumns([]);
            setColumnMapping({});
            setPreviewRows([]);
            setWarnings([]);
          }}
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Importovať ďalší súbor
        </button>
      </div>
    </div>
  );
}
