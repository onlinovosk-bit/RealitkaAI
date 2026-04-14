import type { PlaybookSectionHeaderProps } from "./components.map";

export function PlaybookSectionHeader({ label, description }: PlaybookSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );
}
