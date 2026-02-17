import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (mcp-server/) and repo root
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

export const config = {
  // ─── Database ────────────────────────────────────────────────────────────
  db: {
    path: process.env.DB_PATH || path.join(__dirname, "..", "data", "ecommerce.db"),
  },

  // ─── RAG Service ───────────────────────────────────────────────
  rag: {
    baseUrl: process.env.RAG_SERVICE_URL || "http://localhost:8000",
  },

  // ─── LLM Provider ──────────────────────────────────────────────────────
  llm: {
    provider: (process.env.LLM_PROVIDER || "ollama") as "ollama" | "groq",
    model: process.env.LLM_MODEL || "llama3.2",
    baseUrl: process.env.LLM_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.LLM_API_KEY || "ollama", // Ollama doesn't need a real key
  },

  // ─── Server ─────────────────────────────────────────────────────────────
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
} as const;
