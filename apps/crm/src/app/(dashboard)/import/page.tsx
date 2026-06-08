import CsvImport from "@/components/import/csv-import";

export default function ImportPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Import príležitostí</h1>
        <p className="mt-1 text-gray-500">
          Nahrajte CSV súbor z Excelu alebo Google Sheets. Príležitosti sa importujú automaticky.
        </p>
        <p className="mt-3 text-sm">
          <a href="/import/universal" className="font-medium text-gray-900 underline hover:text-gray-700">
            Universal CRM Import
          </a>
          {" "}
          — Realvia, RealSoft a ďalšie zdroje s auto-mapovaním stĺpcov.
        </p>
      </div>
      <CsvImport />
    </main>
  );
}
