import type { Lead } from "@/lib/mock-data";
import type { Task } from "@/lib/tasks-store";

export type SmolkoChatIntent = "priority" | "tasks" | "risk" | "summary" | "fallback";

export type SmolkoChatSource = {
  label: string;
  count: number;
};

export type SmolkoChatAnswer = {
  intent: SmolkoChatIntent;
  title: string;
  answer: string;
  bullets: string[];
  cta: string;
  sources: SmolkoChatSource[];
  generatedAt: string;
};

export type SmolkoChatInput = {
  question: string;
  leads: Lead[];
  tasks: Task[];
  now?: Date;
};

export const SMOLKO_CHAT_QUICK_PROMPTS = [
  "Komu mám volať dnes?",
  "Ktoré leady nesmiem stratiť?",
  "Čo mám vybaviť ako prvé?",
] as const;

const HOT_STATUSES = new Set(["Horúci", "Teplý", "Obhliadka", "Ponuka"]);
const OPEN_TASK_STATUSES = new Set(["open", "in_progress"]);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STALE_LEAD_MS = 7 * ONE_DAY_MS;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function leadPriorityScore(lead: Lead, now: Date) {
  const lastContactTime = lead.lastContact ? Date.parse(lead.lastContact) : Number.NaN;
  const staleBoost =
    Number.isNaN(lastContactTime) || now.getTime() - lastContactTime > STALE_LEAD_MS ? 12 : 0;
  const statusBoost = HOT_STATUSES.has(lead.status) ? 10 : 0;
  const priorityBoost = lead.aiPriority === "Vysoká" ? 15 : lead.aiPriority === "Stredná" ? 6 : 0;
  return (lead.score ?? 0) + staleBoost + statusBoost + priorityBoost;
}

function formatLead(lead: Lead, now: Date) {
  const lastContactTime = lead.lastContact ? Date.parse(lead.lastContact) : Number.NaN;
  const contactLabel = Number.isNaN(lastContactTime)
    ? "bez posledného kontaktu"
    : `posledný kontakt ${Math.max(0, Math.floor((now.getTime() - lastContactTime) / ONE_DAY_MS))} dní dozadu`;
  const reason = lead.aiReason ? ` · ${lead.aiReason}` : "";
  return `${lead.name} (${lead.status}, score ${lead.score}) — ${contactLabel}${reason}`;
}

function formatTask(task: Task) {
  const due = task.dueAt ? ` · termín ${new Date(task.dueAt).toLocaleDateString("sk-SK")}` : "";
  return `${task.title} (${task.priority})${due}`;
}

function classifyIntent(question: string): SmolkoChatIntent {
  const q = normalize(question);
  if (/komu|volat|zavolat|kontakt|lead|peniaze|priorit/.test(q)) return "priority";
  if (/uloha|task|vybavit|dnes|prve|follow/.test(q)) return "tasks";
  if (/risk|rizik|stratit|zachran|urgent|meska/.test(q)) return "risk";
  if (/stav|prehlad|kolko|pipeline|sumar/.test(q)) return "summary";
  return "fallback";
}

function topPriorityLeads(leads: Lead[], now: Date) {
  return [...leads]
    .filter((lead) => lead.status !== "Uzavretý" && lead.status !== "Stratený")
    .sort((a, b) => leadPriorityScore(b, now) - leadPriorityScore(a, now))
    .slice(0, 5);
}

function riskyLeads(leads: Lead[], now: Date) {
  return [...leads]
    .filter((lead) => {
      if (lead.status === "Uzavretý" || lead.status === "Stratený") return false;
      const lastContactTime = lead.lastContact ? Date.parse(lead.lastContact) : Number.NaN;
      const stale = Number.isNaN(lastContactTime) || now.getTime() - lastContactTime > STALE_LEAD_MS;
      return stale && ((lead.score ?? 0) >= 60 || HOT_STATUSES.has(lead.status));
    })
    .sort((a, b) => leadPriorityScore(b, now) - leadPriorityScore(a, now))
    .slice(0, 5);
}

function openTasks(tasks: Task[], now: Date) {
  return [...tasks]
    .filter((task) => OPEN_TASK_STATUSES.has(task.status))
    .sort((a, b) => {
      const left = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
      const right = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
      if (left !== right) return left - right;
      return taskPriorityWeight(b.priority) - taskPriorityWeight(a.priority);
    })
    .slice(0, 5);
}

function taskPriorityWeight(priority: string) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

export function answerSmolkoChatQuestion(input: SmolkoChatInput): SmolkoChatAnswer {
  const now = input.now ?? new Date();
  const intent = classifyIntent(input.question);
  const activeLeads = input.leads.filter((lead) => lead.status !== "Uzavretý" && lead.status !== "Stratený");
  const sources: SmolkoChatSource[] = [
    { label: "tenant-scoped leads", count: input.leads.length },
    { label: "tenant-scoped tasks", count: input.tasks.length },
  ];

  if (intent === "priority") {
    const leads = topPriorityLeads(input.leads, now);
    return {
      intent,
      title: "Komu volať teraz",
      answer:
        leads.length > 0
          ? "Začni leadmi, kde sa kombinuje vysoké score, teplý stav alebo dlhší čas bez kontaktu."
          : "V tenant-scoped CRM dátach teraz nevidím otvorený lead na prioritný hovor.",
      bullets: leads.map((lead) => formatLead(lead, now)),
      cta: leads[0] ? `Otvor ${leads[0].name} a sprav prvý hovor.` : "Skontroluj import alebo pridaj nový lead.",
      sources,
      generatedAt: now.toISOString(),
    };
  }

  if (intent === "tasks") {
    const tasks = openTasks(input.tasks, now);
    return {
      intent,
      title: "Čo vybaviť ako prvé",
      answer:
        tasks.length > 0
          ? "Najprv zober otvorené úlohy s termínom a vysokou prioritou."
          : "Nemáš otvorené úlohy v dostupných tenant-scoped dátach.",
      bullets: tasks.map(formatTask),
      cta: tasks[0] ? `Dokonči: ${tasks[0].title}` : "Vytvor úlohu pri najbližšom aktívnom leade.",
      sources,
      generatedAt: now.toISOString(),
    };
  }

  if (intent === "risk") {
    const leads = riskyLeads(input.leads, now);
    return {
      intent,
      title: "Leady, ktoré nesmieš stratiť",
      answer:
        leads.length > 0
          ? "Tieto leady majú signál hodnoty, ale zároveň slabý alebo starý kontakt."
          : "Nevidím urgentný stale-risk lead podľa dostupných score/status/last_contact dát.",
      bullets: leads.map((lead) => formatLead(lead, now)),
      cta: leads[0] ? `Dnes zachráň ${leads[0].name}.` : "Udržuj nové leady aktualizované po každom telefonáte.",
      sources,
      generatedAt: now.toISOString(),
    };
  }

  if (intent === "summary") {
    const hotCount = activeLeads.filter((lead) => HOT_STATUSES.has(lead.status) || lead.score >= 70).length;
    const staleCount = riskyLeads(input.leads, now).length;
    const openTaskCount = input.tasks.filter((task) => OPEN_TASK_STATUSES.has(task.status)).length;
    return {
      intent,
      title: "Rýchly prehľad CRM",
      answer: "Toto je deterministický prehľad z vlastných CRM dát, nie predikcia ani LLM odhad.",
      bullets: [
        `Aktívne leady: ${activeLeads.length}`,
        `Horúce / vysoké score: ${hotCount}`,
        `Riziko bez kontaktu: ${staleCount}`,
        `Otvorené úlohy: ${openTaskCount}`,
      ],
      cta: hotCount > 0 ? "Začni najhodnotnejším leadom a zapíš výsledok hovoru." : "Doplň statusy a posledný kontakt pri leadoch.",
      sources,
      generatedAt: now.toISOString(),
    };
  }

  return {
    intent,
    title: "Neviem bezpečne odpovedať bez dohadu",
    answer:
      "Tento chatbot v prvej verzii odpovedá iba na CRM priority, rizikové leady, otvorené úlohy a rýchly pipeline prehľad.",
    bullets: [...SMOLKO_CHAT_QUICK_PROMPTS],
    cta: "Skús jednu z navrhnutých otázok.",
    sources,
    generatedAt: now.toISOString(),
  };
}
