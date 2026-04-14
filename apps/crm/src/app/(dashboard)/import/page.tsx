import CsvImport from "@/components/import/csv-import";

export default function ImportPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Import príležitostí</h1>
        <p className="mt-1 text-gray-500">
          Nahrajte CSV súbor z Excelu alebo Google Sheets. Príležitosti sa importujú automaticky.
        </p>
      </div>
      <CsvImport />
    </main>
  );
}
