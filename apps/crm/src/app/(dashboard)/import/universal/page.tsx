import UniversalImportWizard from "@/components/universal-import/universal-import-wizard";
import Link from "next/link";

export default function UniversalImportPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/import" className="text-sm text-gray-500 hover:text-gray-700 underline">
          ← Späť na klasický import
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Universal CRM Import</h1>
        <p className="mt-1 text-gray-500">
          Import kontaktov z Realvie, RealSoft, Google Kontaktov a ďalších zdrojov s automatickým
          mapovaním stĺpcov.
        </p>
      </div>
      <UniversalImportWizard />
    </main>
  );
}
