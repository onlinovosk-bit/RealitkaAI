import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sources = [
    "https://www.google.com/search?q=realitná+kancelária+Slovensko",
    "https://www.zoznamrealit.sk/realitne-kancelarie",
  ];

  const results: any[] = [];

  for (const url of sources) {
    const html = await fetch(url).then((r) => r.text());
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      const text = $(el).text();
      const href = $(el).attr("href");

      if (text.includes("Reality") || text.includes("Realitná kancelária")) {
        results.push({
          agency_name: text.trim(),
          website_url: href || null,
          source: url,
        });
      }
    });
  }

  for (const agency of results) {
    await supabase
      .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
      .insert({
        agency_name: agency.agency_name,
        website_url: agency.website_url,
        source: agency.source,
        status: "PROSPECT",
        raw_data: agency,
      })
      .catch(() => {});
  }

  return NextResponse.json({ inserted: results.length });
}
