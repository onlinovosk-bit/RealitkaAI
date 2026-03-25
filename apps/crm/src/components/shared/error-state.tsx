export default function ErrorState({
  title = "Nastala chyba",
  description = "Niečo sa nepodarilo načítať alebo spracovať.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h3 className="text-lg font-semibold text-red-700">{title}</h3>
      <p className="mt-2 text-sm text-red-600">{description}</p>
    </div>
  );
}
