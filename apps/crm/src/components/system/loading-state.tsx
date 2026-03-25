export default function LoadingState({
  title = "Načítavam...",
}: {
  title?: string;
}) {
  return (
    <div className="flex items-center justify-center p-10 text-sm text-gray-500">
      {title}
    </div>
  );
}
