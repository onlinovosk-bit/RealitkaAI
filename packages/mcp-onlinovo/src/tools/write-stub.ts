import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolResponse } from "@revolis/mcp-shared";
import { beginAudit } from "../audit.js";
import { denyWrite } from "../policy.js";

export const writeProductTool: Tool = {
  name: "onlinovo_write_product",
  description:
    "Write stub. Always denied in MVP. Exists so clients discover that writes are gated, not missing.",
  inputSchema: {
    type: "object",
    properties: {
      sku: { type: "string" },
      patch: { type: "object" },
    },
    additionalProperties: false,
  },
};

export async function handleWriteProduct(_args: unknown) {
  const audit = beginAudit("onlinovo_write_product");
  const denied = denyWrite("onlinovo_write_product");
  const response: ToolResponse<never> = {
    success: false,
    request_id: audit.request_id,
    error: denied,
  };
  audit.finish({ denied: true });
  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    isError: true,
  };
}
