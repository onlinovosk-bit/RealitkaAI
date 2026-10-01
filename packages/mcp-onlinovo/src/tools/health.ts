import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolResponse } from "@revolis/mcp-shared";
import { beginAudit } from "../audit.js";
import { resolveAdapter } from "../resolve-adapter.js";

export const healthTool: Tool = {
  name: "onlinovo_health",
  description:
    "Onlinovo MCP health. Reports adapter name, whether a live shop is connected, and that writes are disabled in MVP.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

export async function handleHealth(_args: unknown) {
  const audit = beginAudit("onlinovo_health");
  const adapter = resolveAdapter();
  const shop = await adapter.health();
  const response: ToolResponse<{
    adapter: string;
    write_enabled: false;
    shop_connected: boolean;
    detail: string;
  }> = {
    success: true,
    request_id: audit.request_id,
    data: {
      adapter: adapter.source,
      write_enabled: false,
      shop_connected: shop.shop_connected,
      detail: shop.detail,
    },
  };
  audit.finish({ adapter: adapter.source, shop_connected: shop.shop_connected });
  return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
}
