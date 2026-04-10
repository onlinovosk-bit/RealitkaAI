export type Lead = {
  id: string; // unikátne ID leadu
  name: string; // meno klienta
  status: string; // status (Nový, Teplý, Horúci...)
  last_contact_at?: string; // posledný kontakt
  created_at: string; // vytvorenie
};

// helper na výpočet rozdielu dní
function daysSince(date: string) {
  const now = new Date(); // aktuálny čas
  const past = new Date(date); // čas záznamu
  const diff = now.getTime() - past.getTime(); // rozdiel v ms
  return Math.floor(diff / (1000 * 60 * 60 * 24)); // prevod na dni
}

// hlavná funkcia
export function generateDailyActions(leads: Lead[]) {
  const actions: string[] = []; // pole akcií

  leads.forEach((lead) => {
    // HOT LEAD → okamžite volať
    if (lead.status === "Horúci") {
      actions.push(`Zavolaj ${lead.name} (horúci lead)`); // akcia
    }

    // ak nebol kontaktovaný 2+ dni
    if (lead.last_contact_at && daysSince(lead.last_contact_at) >= 2) {
      actions.push(`Napíš ${lead.name} (čaká ${daysSince(lead.last_contact_at)} dni)`); // akcia
    }

    // nový lead → kontaktovať
    if (lead.status === "Nový") {
      actions.push(`Kontaktuj ${lead.name} (nový lead)`); // akcia
    }
  });

  return actions.slice(0, 5); // max 5 akcií
}
