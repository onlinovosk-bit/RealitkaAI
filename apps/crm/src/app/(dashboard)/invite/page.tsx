import InviteForm from "@/components/team/invite-form";

export default function InvitePage() {
  return (
    <main className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pozvať kolegu</h1>
        <p className="mt-1 text-gray-500">
          Kolega dostane email s linkom na prihlásenie. Ihneď bude mať prístup k CRM.
        </p>
      </div>
      <InviteForm />
    </main>
  );
}
