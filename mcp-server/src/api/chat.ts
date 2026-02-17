/**
 * Express chat endpoint — the HTTP API layer.
 *
 * POST /chat
 *   Body: { message: string, history?: { role, content }[] }
 *   Returns: { response, toolCalls, timing }
 *
 * This is how external clients interact with the agent.
 * The endpoint passes the message to the orchestrator, which handles
 * all tool calling and LLM interaction internally.
 */

import { Router, type Request, type Response } from "express";
import { orchestrate, type ConversationMessage } from "../agent/orchestrator.js";

export const chatRouter = Router();

interface ChatRequest {
  message: string;
  history?: ConversationMessage[];
}

chatRouter.post("/chat", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { message, history } = req.body as ChatRequest;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        error: "Missing or empty 'message' field in request body",
      });
      return;
    }

    console.log(`\n[Chat] Received: "${message}"`);

    const result = await orchestrate(message.trim(), history || []);

    const elapsed = Date.now() - startTime;
    console.log(
      `[Chat] Responded in ${elapsed}ms (${result.toolCalls.length} tool call(s))`
    );

    res.json({
      response: result.response,
      toolCalls: result.toolCalls,
      timing: {
        totalMs: elapsed,
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Chat] Error after ${elapsed}ms:`, error);

    res.status(500).json({
      error: "Internal server error",
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred",
    });
  }
});
