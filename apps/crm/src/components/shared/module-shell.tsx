import SectionHeader from "@/components/shared/section-header";

export default function ModuleShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="p-6">
      <SectionHeader title={title} description={description} />
      {children}
    </main>
  );
}
