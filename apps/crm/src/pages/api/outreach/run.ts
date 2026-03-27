import type { NextApiRequest, NextApiResponse } from "next";
import { runOutreachSequence } from "../../../scripts/outreach-automation-2.0";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { leadId } = req.body;

  if (!leadId || typeof leadId !== "string") {
    return res.status(400).json({ ok: false, error: "Missing leadId" });
  }

  try {
    await runOutreachSequence(leadId);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Outreach failed" });
  }
}
