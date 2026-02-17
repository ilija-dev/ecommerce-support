/**
 * Demo script — sends scripted scenarios to the /chat endpoint
 * and prints the agent's response + tool calls.
 *
 * Shows:
 *   1. Single-tool query (order lookup)
 *   2. Single-tool query (inventory check)
 *   3. Single-tool query (policy search)
 *   4. Multi-tool chain (order + policy)
 *   5. Multi-tool chain (order + inventory)
 *   6. Edge case (non-existent order)
 *
 * Prerequisites:
 *   - MCP server running:     cd mcp-server && npm run dev
 *   - RAG service running:    cd rag-service && source venv/bin/activate && python -m src.main
 *   - LLM available:          Ollama running with llama3.2, or Groq API key set
 *
 * Run with: npx tsx demo/demo.ts
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

interface ChatResponse {
  response: string;
  toolCalls: {
    tool: string;
    args: Record<string, unknown>;
    result: string;
  }[];
  timing: {
    totalMs: number;
  };
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    name: "1. Order Lookup (single tool)",
    description: "Customer asks about a specific order — should call order_lookup only",
    message: "Can you check on my order ORD-1001? I want to know when it will arrive.",
  },
  {
    name: "2. Inventory Check (single tool)",
    description: "Customer asks about product availability — should call inventory_check only",
    message: "Do you have the Wireless Bluetooth Headphones in stock?",
  },
  {
    name: "3. Policy Search (single tool)",
    description: "Customer asks about return policy — should call policy_search only",
    message: "What is your return policy for electronics?",
  },
  {
    name: "4. Order + Policy (multi-tool chain)",
    description:
      "Customer's order is late — should call order_lookup THEN policy_search for compensation",
    message:
      "My order ORD-1001 seems delayed. What compensation can you offer for late deliveries?",
  },
  {
    name: "5. Order + Inventory (multi-tool chain)",
    description:
      "Customer wants a replacement — should call order_lookup THEN inventory_check",
    message:
      "I need to replace the Running Shoes Ultra from my order. Do you have them in stock?",
  },
  {
    name: "6. Non-existent Order (edge case)",
    description: "Customer references an order that doesn't exist — agent should handle gracefully",
    message: "Where is my order ORD-9999?",
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

async function sendMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return (await response.json()) as ChatResponse;
}

function printDivider(): void {
  console.log("\n" + "═".repeat(70) + "\n");
}

async function runDemo(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              E-Commerce Support Copilot — Demo                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");

  // Check if the API is running
  try {
    const health = await fetch(`${API_URL}/health`);
    if (!health.ok) throw new Error("Health check failed");
    const healthData = (await health.json()) as Record<string, unknown>;
    console.log(`\nAPI: ${API_URL} — healthy`);
    console.log(`LLM: ${JSON.stringify((healthData as any).llm)}`);
  } catch {
    console.error(`\nError: Cannot reach API at ${API_URL}`);
    console.error("Make sure the MCP server is running: cd mcp-server && npm run dev");
    process.exit(1);
  }

  for (const scenario of SCENARIOS) {
    printDivider();
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Expected: ${scenario.description}`);
    console.log(`\nCustomer: "${scenario.message}"`);

    try {
      const result = await sendMessage(scenario.message);

      // Show tool calls
      if (result.toolCalls.length > 0) {
        console.log(`\nTools called (${result.toolCalls.length}):`);
        for (const call of result.toolCalls) {
          console.log(`  → ${call.tool}(${JSON.stringify(call.args)})`);
        }
      } else {
        console.log("\nNo tools called (direct response)");
      }

      // Show response
      console.log(`\nAgent Response:`);
      console.log(
        result.response
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")
      );

      console.log(`\nTiming: ${result.timing.totalMs}ms`);
    } catch (error) {
      console.error(
        `\nError: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  printDivider();
  console.log("Demo complete!\n");
}

runDemo().catch(console.error);
