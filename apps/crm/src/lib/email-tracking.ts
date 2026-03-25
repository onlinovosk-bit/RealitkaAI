// email-tracking.ts
// Resend webhook-based reply tracking for outreach automation
import { promises as fs } from "fs";
import path from "path";

const REPLIES_FILE = path.resolve(process.cwd(), "data/resend-replies.json");

// Called by webhook endpoint to store reply
export async function storeReply({ leadId, content, receivedAt }: { leadId: string; content: string; receivedAt: string }) {
  let replies: any[] = [];
  try {
    const raw = await fs.readFile(REPLIES_FILE, "utf-8");
    replies = JSON.parse(raw);
  } catch {}
  replies.push({ leadId, content, receivedAt });
  await fs.writeFile(REPLIES_FILE, JSON.stringify(replies, null, 2));
}

// Returns all replies for a given lead
export async function getRepliesForLead(leadId: string): Promise<{ id: string; content: string; receivedAt: string }[]> {
  try {
    const raw = await fs.readFile(REPLIES_FILE, "utf-8");
    const replies = JSON.parse(raw);
    return replies.filter((r: any) => r.leadId === leadId);
  } catch {
    return [];
  }
}
