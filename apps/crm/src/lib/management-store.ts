import { listLeads } from "@/lib/leads-store";
import { listTasks } from "@/lib/tasks-store";
import { listProfiles } from "@/lib/team-store";
import { listPersistedMatches } from "@/lib/matching-store";
import { listRecommendations } from "@/lib/recommendations-store";

export async function getManagementDashboardData() {
  const [leads, tasks, profiles, matches, recommendations] = await Promise.all([
    listLeads(),
    listTasks(),
    listProfiles(),
    listPersistedMatches(),
    listRecommendations(),
  ]);

  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => lead.status === "Horúci").length;
  const showingLeads = leads.filter((lead) => lead.status === "Obhliadka").length;
  const offerLeads = leads.filter((lead) => lead.status === "Ponuka").length;

  const avgLeadScore =
    leads.length > 0
      ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length)
      : 0;

  const openTasks = tasks.filter((task) => task.status === "open").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length;

  const totalMatches = matches.length;
  const strongMatches = matches.filter((match) => match.matchScore >= 80).length;

  const totalRecommendations = recommendations.length;
  const highRecommendations = recommendations.filter(
    (item) => item.priority === "high"
  ).length;

  const agentPerformance = profiles.map((profile) => {
    const profileLeads = leads.filter(
      (lead) =>
        lead.assignedAgent === profile.fullName ||
        (lead as any).assignedProfileId === profile.id
    );

    const assignedTasks = tasks.filter(
      (task) => task.assignedProfileId === profile.id
    );

    const avgScore =
      profileLeads.length > 0
        ? Math.round(
            profileLeads.reduce((sum, lead) => sum + lead.score, 0) /
              profileLeads.length
          )
        : 0;

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      role: profile.role,
      totalLeads: profileLeads.length,
      hotLeads: profileLeads.filter((lead) => lead.status === "Horúci").length,
      showings: profileLeads.filter((lead) => lead.status === "Obhliadka").length,
      offers: profileLeads.filter((lead) => lead.status === "Ponuka").length,
      avgScore,
      openTasks: assignedTasks.filter((task) => task.status === "open").length,
      doneTasks: assignedTasks.filter((task) => task.status === "done").length,
    };
  });

  const pipeline = [
    { label: "Nový", count: leads.filter((lead) => lead.status === "Nový").length },
    { label: "Teplý", count: leads.filter((lead) => lead.status === "Teplý").length },
    { label: "Horúci", count: leads.filter((lead) => lead.status === "Horúci").length },
    { label: "Obhliadka", count: leads.filter((lead) => lead.status === "Obhliadka").length },
    { label: "Ponuka", count: leads.filter((lead) => lead.status === "Ponuka").length },
  ];

  const topLeads = [...leads]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const topMatches = [...matches]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)
    .map((match) => {
      const lead = leads.find((item) => item.id === match.leadId);
      return {
        ...match,
        leadName: lead?.name ?? match.leadId,
      };
    });

  const recommendationFeed = recommendations
    .slice(0, 8)
    .map((item) => {
      const lead = leads.find((lead) => lead.id === item.leadId);

      return {
        ...item,
        leadName: lead?.name ?? item.leadId ?? "-",
      };
    });

  return {
    kpis: {
      totalLeads,
      hotLeads,
      showingLeads,
      offerLeads,
      avgLeadScore,
      openTasks,
      inProgressTasks,
      doneTasks,
      highPriorityTasks,
      totalMatches,
      strongMatches,
      totalRecommendations,
      highRecommendations,
    },
    agentPerformance,
    pipeline,
    topLeads,
    topMatches,
    recommendationFeed,
  };
}
