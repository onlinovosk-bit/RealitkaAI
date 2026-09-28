import ListingGeneratorClient from "@/components/listing-generator/ListingGeneratorClient";

export const metadata = {
  title: "Generátor inzerátu | Revolis",
  description:
    "Z parametrov nehnuteľnosti vygeneruje texty na portál, Facebook, Instagram a e-mail.",
};

export default function InzeratGeneratorPage() {
  return (
    <main className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Generátor inzerátu</h1>
          <p className="mt-1 text-sm text-slate-400">
            Zadaj parametre nehnuteľnosti a AI napíše texty na portál, Facebook, Instagram
            a e-mail. Všetko sa dá pred použitím upraviť a úpravy sa uložia.
          </p>
        </div>
        <ListingGeneratorClient />
      </div>
    </main>
  );
}
