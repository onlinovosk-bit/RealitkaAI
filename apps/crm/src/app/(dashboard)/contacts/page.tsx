import { redirect } from "next/navigation";

type ContactsPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const target = params.scope === "shared" ? "/leads?scope=shared" : "/leads";
  redirect(target);
}
