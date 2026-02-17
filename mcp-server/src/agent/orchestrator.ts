/**
 * Agent Orchestrator — the "brain" of the support copilot.
 *
 * Flow:
 *   1. Receive user message + conversation history
 *   2. Send to LLM with system prompt + tool definitions
 *   3. If LLM returns tool_calls → execute them, append results, loop back to 2
 *   4. If LLM returns a text response → return it as the final answer
 *
 * The LLM decides which tools to call based on the user's message and the
 * tool descriptions. This is NOT if/else routing — it's LLM-driven delegation.
 *
 * Tools are called directly (not through MCP protocol) since the agent
 * and tools live in the same process. The MCP server exists for external clients.
 */

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.js";
import { config } from "../config.js";
import type { OrderStatus, ProductCategory } from "../db/models.js";
import { orderLookup } from "../tools/order-lookup.js";
import { inventoryCheck } from "../tools/inventory-check.js";
import { policySearch } from "../tools/policy-search.js";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "./prompts.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OrchestratorResult {
  response: string;
  toolCalls: ToolCallRecord[];
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

// ─── Tool Definitions (OpenAI function calling format) ───────────────────────

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "order_lookup",
      description:
        "Look up order details by order ID, customer email, or order status. " +
        "Returns full order information including line items, tracking number, " +
        "and estimated delivery date.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Order ID like ORD-1001",
          },
          email: {
            type: "string",
            description: "Customer email address",
          },
          status: {
            type: "string",
            enum: [
              "pending",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "returned",
            ],
            description: "Filter by order status",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "inventory_check",
      description:
        "Check product inventory and stock levels. Search by product ID, " +
        "product name (partial match supported), or product category.",
      parameters: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "Product ID like PROD-001",
          },
          product_name: {
            type: "string",
            description: "Product name or partial name to search",
          },
          category: {
            type: "string",
            enum: [
              "electronics",
              "clothing",
              "home_garden",
              "sports",
              "books",
              "toys",
            ],
            description: "Product category filter",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "policy_search",
      description:
        "Search company policy documents. Covers returns, shipping, " +
        "compensation, and warranty policies. Use for questions about " +
        "refunds, return windows, shipping times, or compensation.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Natural language question about policies, e.g. 'what is the return policy for electronics?'",
          },
        },
        required: ["query"],
      },
    },
  },
];

// NOTE: response_draft is intentionally excluded from the orchestrator's tool list.
// The agentic loop already handles final response synthesis — when the LLM has all
// tool results, it produces a text response (no tool_calls) and the loop exits.
// Including response_draft caused infinite loops: the LLM would call it, see the
// result, then call more tools instead of stopping.

// ─── Tool Executor ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "order_lookup": {
      const results = orderLookup({
        order_id: args.order_id as string | undefined,
        email: args.email as string | undefined,
        status: args.status as OrderStatus | undefined,
      });
      return results.length > 0
        ? JSON.stringify(results, null, 2)
        : "No orders found matching the given criteria.";
    }

    case "inventory_check": {
      const results = inventoryCheck({
        product_id: args.product_id as string | undefined,
        product_name: args.product_name as string | undefined,
        category: args.category as ProductCategory | undefined,
      });
      return results.length > 0
        ? JSON.stringify(results, null, 2)
        : "No products found matching the given criteria.";
    }

    case "policy_search": {
      const rawTopK = args.top_k;
      const top_k = rawTopK != null ? Number(rawTopK) : undefined;
      const results = await policySearch({
        query: args.query as string,
        top_k: Number.isNaN(top_k) ? undefined : top_k,
      });
      if (results.results.length === 0) {
        return "No relevant policy information found.";
      }
      return results.results
        .map(
          (chunk) =>
            `[Source: ${chunk.source}, Relevance: ${(chunk.score * 100).toFixed(1)}%]\n${chunk.text}`
        )
        .join("\n\n---\n\n");
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops

/**
 * Run the agent orchestrator.
 *
 * Takes a user message and optional conversation history,
 * runs the agentic tool-calling loop, and returns the final response
 * along with a record of all tool calls made.
 */
export async function orchestrate(
  userMessage: string,
  conversationHistory: ConversationMessage[] = []
): Promise<OrchestratorResult> {
  const client = new OpenAI({
    baseURL: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
  });

  // Build message history
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const toolCallRecords: ToolCallRecord[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages,
      tools: TOOLS,
      temperature: 0.3, // Lower temperature for more deterministic tool selection
    });

    const choice = response.choices[0];
    if (!choice) {
      return {
        response: "I'm sorry, I wasn't able to process your request.",
        toolCalls: toolCallRecords,
      };
    }

    const assistantMessage = choice.message;

    // If the LLM wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to history
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments) as Record<
          string,
          unknown
        >;

        console.log(
          `  [Tool] ${toolCall.function.name}(${JSON.stringify(args)})`
        );

        const result = await executeTool(toolCall.function.name, args);

        // Record the tool call
        toolCallRecords.push({
          tool: toolCall.function.name,
          args,
          result:
            result.length > 500
              ? result.substring(0, 500) + "... (truncated)"
              : result,
        });

        // Add tool result to message history
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Loop back — the LLM will see the tool results and either
      // call more tools or produce a final response
      continue;
    }

    // No tool calls — this is the final response
    return {
      response:
        assistantMessage.content ||
        "I'm sorry, I wasn't able to generate a response.",
      toolCalls: toolCallRecords,
    };
  }

  // Hit max iterations — return what we have
  return {
    response:
      "I gathered some information but reached my processing limit. " +
      "Please try a more specific question.",
    toolCalls: toolCallRecords,
  };
}
