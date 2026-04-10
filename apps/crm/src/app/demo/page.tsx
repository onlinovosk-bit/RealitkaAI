import DemoRequestForm from "@/components/demo/demo-request-form";

export const metadata = {
  title: "Demo request",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Revolis.AI Demo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Získaj nezáväzné demo na mieru pre tvoju realitnú kanceláriu: do 30 minút uvidíš, ako AI hodnotenie
          kontaktov, automatické oslovovanie klientov a predikcia obchodného lievika pomáhajú zrýchliť reakcie na
          kontakty, zvýšiť počet obhliadok
          a podporiť viac uzavretých obchodov.
        </p>

        <div className="mt-6">
          <DemoRequestForm />
        </div>
      </div>
    </main>
  );
}
