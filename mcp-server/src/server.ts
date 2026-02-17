/**
 * MCP Server — registers tools with the @modelcontextprotocol/sdk.
 *
 * This is the MCP protocol layer. Each tool is registered with:
 *   - A name (used by the agent to call it)
 *   - A description (the LLM reads this to decide when to use the tool)
 *   - A Zod schema for input validation (reused from models.ts)
 *   - A handler function (calls the tool implementation from tools/)
 *
 * The MCP SDK handles protocol serialization, input validation, and
 * error formatting. Our tool functions stay pure and protocol-unaware.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderStatus, ProductCategory } from "./db/models.js";
import { orderLookup } from "./tools/order-lookup.js";
import { inventoryCheck } from "./tools/inventory-check.js";
import { policySearch } from "./tools/policy-search.js";
import { responseDraft } from "./tools/response-draft.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ecommerce-support-tools",
    version: "1.0.0",
  });

  // ─── order_lookup ────────────────────────────────────────────────────────

  server.tool(
    "order_lookup",
    "Look up order details by order ID, customer email, or order status. " +
      "Returns full order information including line items, tracking number, " +
      "and estimated delivery. Use this when a customer asks about their order.",
    {
      order_id: z.string().optional().describe("Order ID like ORD-1001"),
      email: z.string().email().optional().describe("Customer email address"),
      status: OrderStatus.optional().describe("Filter by order status"),
    },
    async ({ order_id, email, status }) => {
      const results = orderLookup({ order_id, email, status });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No orders found matching the given criteria.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  // ─── inventory_check ─────────────────────────────────────────────────────

  server.tool(
    "inventory_check",
    "Check product inventory and stock levels. Search by product ID, " +
      "product name (partial match supported), or product category. " +
      "Returns stock quantity, price, and availability status.",
    {
      product_id: z.string().optional().describe("Product ID like PROD-001"),
      product_name: z
        .string()
        .optional()
        .describe("Product name or partial name to search for"),
      category: ProductCategory.optional().describe(
        "Product category: electronics, clothing, home_garden, sports, books, toys"
      ),
    },
    async ({ product_id, product_name, category }) => {
      const results = inventoryCheck({ product_id, product_name, category });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No products found matching the given criteria.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  // ─── policy_search ───────────────────────────────────────────────────────

  server.tool(
    "policy_search",
    "Search company policy documents using semantic similarity. " +
      "Covers return policies, shipping policies, compensation policies, " +
      "and warranty information. Use this when a customer asks about policies, " +
      "returns, refunds, warranties, shipping times, or compensation for issues.",
    {
      query: z
        .string()
        .describe(
          "Natural language question about company policies, e.g. 'what is the return policy for electronics?'"
        ),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Number of relevant policy chunks to return (default 3)"),
    },
    async ({ query, top_k }) => {
      const results = await policySearch({ query, top_k });

      if (results.results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant policy information found. The policy search service may be unavailable.",
            },
          ],
        };
      }

      // Format chunks for the LLM — include source and score for context
      const formatted = results.results
        .map(
          (chunk, i) =>
            `[Source: ${chunk.source}, Relevance: ${(chunk.score * 100).toFixed(1)}%]\n${chunk.text}`
        )
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: formatted,
          },
        ],
      };
    }
  );

  // ─── response_draft ──────────────────────────────────────────────────────

  server.tool(
    "response_draft",
    "Draft a professional customer support response. Provide the customer's " +
      "original message and any context gathered from other tools (order details, " +
      "policy information, inventory data). The tool will generate an empathetic, " +
      "accurate response. Use this as the final step after gathering all needed information.",
    {
      customer_message: z
        .string()
        .describe("The customer's original message or question"),
      context: z
        .string()
        .describe(
          "Context gathered from other tools — order details, policy info, inventory data"
        ),
      tone: z
        .enum(["empathetic", "professional", "concise"])
        .optional()
        .describe("Response tone (default: professional)"),
    },
    async ({ customer_message, context, tone }) => {
      try {
        const result = await responseDraft({
          customer_message,
          context,
          tone,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: result.draft,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Unable to draft response: ${error instanceof Error ? error.message : "Unknown error"}. Please compose a response manually using the gathered context.`,
            },
          ],
        };
      }
    }
  );

  return server;
}
