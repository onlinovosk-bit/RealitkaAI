// followup-templates.ts
// Provides follow-up templates for outreach automation

export type FollowupTemplate = {
  templateId: string;
  name: string;
  delayDays: number;
  subject: string;
  body: string;
};

// TODO: Load from followups.md or database in production
export async function getFollowupTemplates(): Promise<FollowupTemplate[]> {
  return [
    {
      templateId: "fup1",
      name: "Follow-up 1",
      delayDays: 2,
      subject: "Pripomienka po 2 dňoch",
      body: "Dobrý deň, pripomíname sa ohľadom vašej požiadavky...",
    },
    {
      templateId: "fup2",
      name: "Follow-up 2",
      delayDays: 5,
      subject: "Druhá pripomienka po 5 dňoch",
      body: "Stále máte záujem? Radi vám pomôžeme...",
    },
    {
      templateId: "fup3",
      name: "Follow-up 3",
      delayDays: 10,
      subject: "Záverečný follow-up po 10 dňoch",
      body: "Toto je posledná pripomienka, neváhajte nás kontaktovať...",
    },
  ];
}
