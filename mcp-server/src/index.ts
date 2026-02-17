/**
 * Entry point — starts the Express API server.
 *
 * Wires together:
 *   - Express API with POST /chat endpoint
 *   - MCP server (created but transport is optional — the orchestrator
 *     calls tools directly, MCP server is for external clients)
 *   - SQLite database (auto-seeds if empty)
 *
 * Run with: npm run dev (tsx watch) or npm start (compiled)
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { chatRouter } from "./api/chat.js";
import { createMcpServer } from "./server.js";
import { getDb } from "./db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   E-Commerce Support Copilot                ║");
  console.log("║   MCP Server + Agent Orchestrator           ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ─── Database check ──────────────────────────────────────────────────────
  const db = getDb();
  const orderCount = (
    db.prepare("SELECT COUNT(*) as count FROM orders").get() as {
      count: number;
    }
  ).count;

  if (orderCount === 0) {
    console.log(
      "[DB] Database is empty. Run 'npm run seed' to populate with mock data.\n"
    );
  } else {
    console.log(`[DB] SQLite connected — ${orderCount} orders in database`);
  }

  // ─── MCP Server ──────────────────────────────────────────────────────────
  const mcpServer = createMcpServer();
  console.log("[MCP] Server created with 4 tools: order_lookup, inventory_check, policy_search, response_draft");

  // ─── Express API ─────────────────────────────────────────────────────────
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "ecommerce-support-copilot",
      llm: {
        provider: config.llm.provider,
        model: config.llm.model,
        baseUrl: config.llm.baseUrl,
      },
      rag: {
        serviceUrl: config.rag.baseUrl,
      },
      database: {
        orders: orderCount,
      },
    });
  });

  // Chat endpoint
  app.use(chatRouter);

  // Serve static frontend
  // Use process.cwd() — works in both local dev (cwd = mcp-server/) and
  // Docker (WORKDIR = /app). __dirname with tsx/ESM can resolve unexpectedly.
  const publicDir = path.join(process.cwd(), "public");
  console.log(`[Static] Serving frontend from ${publicDir}`);
  app.use(express.static(publicDir));

  // Start server
  app.listen(config.server.port, () => {
    console.log(`[API] Express server listening on http://localhost:${config.server.port}`);
    console.log(`\n── Configuration ──`);
    console.log(`  LLM Provider:  ${config.llm.provider}`);
    console.log(`  LLM Model:     ${config.llm.model}`);
    console.log(`  LLM Base URL:  ${config.llm.baseUrl}`);
    console.log(`  RAG Service:   ${config.rag.baseUrl}`);
    console.log(`  Database:      ${config.db.path}`);
    console.log(`\n── Endpoints ──`);
    console.log(`  GET  /          — Brutalist chat UI`);
    console.log(`  POST /chat     — Send a customer support message`);
    console.log(`  GET  /health   — Health check + config info`);
    console.log(`\n── Example ──`);
    console.log(`  curl -X POST http://localhost:${config.server.port}/chat \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"message": "Where is my order ORD-1001?"}'`);
    console.log("");
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
