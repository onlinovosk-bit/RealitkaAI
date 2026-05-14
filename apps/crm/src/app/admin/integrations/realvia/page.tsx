import { redirect } from 'next/navigation';

/** Historic path; middleware / deploy differences caused 404. Canonical: /integrations/realvia */
export default function AdminIntegrationsRealviaRedirectPage() {
  redirect('/integrations/realvia');
}
