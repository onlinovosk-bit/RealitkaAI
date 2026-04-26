// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function fetchPriceFeeds(searchParams: URLSearchParams) {
  const city = searchParams.get("city");

  let query = supabase
    .from("b2b_price_intelligence")
    .select("city,district,property_type,avg_market_price,sample_size,median_price,last_updated")
    .order("sample_size", { ascending: false })
    .limit(200);

  if (city) query = query.ilike("city", `${city}%`);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function fetchHeatmapData(searchParams: URLSearchParams) {
  const city = searchParams.get("city");
  const { data, error } = await supabase.rpc("get_supply_demand_gap", {
    city_name: city,
  });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return new Response("Unauthorized", { status: 401 });

  const { data: apiUser, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, tier, request_limit, usage_count, is_active")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error || !apiUser || !apiUser.is_active) {
    return new Response("Unauthorized", { status: 401 });
  }

  if ((apiUser.usage_count ?? 0) >= (apiUser.request_limit ?? 0)) {
    return new Response("Rate limit exceeded. Upgrade to Enterprise.", { status: 429 });
  }

  await supabase.rpc("increment_api_usage", { key_id: apiKey });

  const url = new URL(req.url);
  if (url.pathname.includes("/price-intelligence")) return fetchPriceFeeds(url.searchParams);
  if (url.pathname.includes("/demand-heatmap")) return fetchHeatmapData(url.searchParams);

  return new Response("Endpoint not found", { status: 404 });
});
