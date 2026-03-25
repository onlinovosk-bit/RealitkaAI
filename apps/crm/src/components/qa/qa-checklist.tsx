export default function QaChecklist() {
  const groups = [
    {
      title: "Prihlasovanie a odhlasovanie",
      items: [
        "Registrácia: otvor /register, vytvor nový účet a skontroluj presmerovanie.",
        "Login: otvor /login, prihlás sa a skontroluj vstup do dashboardu.",
        "Logout: klikni na Odhlásiť sa a over, že chránené routy presmerujú späť na /login.",
      ],
    },
    {
      title: "Leady",
      items: [
        "Create lead: otvor /leads, vytvor nový lead a over jeho zobrazenie v tabuľke.",
        "Update lead: otvor detail leadu, uprav stav alebo poznámku a ulož zmeny.",
      ],
    },
    {
      title: "Properties",
      items: [
        "Create property: otvor /properties, pridaj novú nehnuteľnosť a over zobrazenie v inventory.",
      ],
    },
    {
      title: "AI a matching",
      items: [
        "Matching recalc: otvor /matching, klikni Prepočítať matching a over nové záznamy.",
        "Recommendations recalc: otvor /recommendations, klikni Prepočítať odporúčania a over uložené výsledky.",
      ],
    },
    {
      title: "Tasks a management",
      items: [
        "Create task: otvor /tasks, vytvor úlohu a over jej zobrazenie v zozname.",
        "Management page: otvor /management a over KPI, výkon agentov a prehľady.",
      ],
    },
    {
      title: "System",
      items: [
        "System page: otvor /system a over env diagnostiku a režim systému.",
        "Activities: po vykonaní vyšších krokov otvor /activities a over, že sa aktivity zapisujú.",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
          <div className="mt-4 space-y-3">
            {group.items.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
