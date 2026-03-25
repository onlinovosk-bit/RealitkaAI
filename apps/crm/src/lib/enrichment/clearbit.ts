// Integrácia na Clearbit API pre enrichment leadov
// Vyžaduje CLEARBIT_API_KEY v env

export async function enrichWithClearbit(email: string): Promise<any> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) throw new Error('Chýba CLEARBIT_API_KEY');
  const url = `https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`Clearbit error: ${res.status}`);
  return await res.json();
}
