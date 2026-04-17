import OnboardingSidebar from "./OnboardingSidebar";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white text-gray-900 font-sans">
      <OnboardingSidebar />
      <main className="flex-1 px-8 py-10 md:px-16 md:py-14 max-w-3xl mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
