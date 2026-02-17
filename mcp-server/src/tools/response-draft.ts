/**
 * Response Draft Tool
 *
 * Uses an LLM to draft a customer-facing support response.
 * Takes the customer's original message + context from other tools
 * (order details, policy info, inventory data) and produces a
 * professional, empathetic response.
 *
 * Works with both Ollama (local) and Groq (cloud) via the openai package.
 */

import OpenAI from "openai";
import { config } from "../config.js";

export interface ResponseDraftInput {
  customer_message: string;
  context: string;
  tone?: "empathetic" | "professional" | "concise";
}

export interface ResponseDraftResult {
  draft: string;
  model: string;
}

const SYSTEM_PROMPT = `You are a helpful customer support agent for an e-commerce store. 
Draft a response to the customer based on the provided context.

Guidelines:
- Be empathetic and professional
- Reference specific details from the context (order IDs, tracking numbers, policy details)
- If the context contains policy information, cite the relevant policy
- Keep responses concise but thorough — 2-4 short paragraphs max
- If you cannot fully resolve the issue, clearly state next steps
- Never make up information not present in the context
- Do not include greetings like "Dear Customer" — the agent will add those`;

/**
 * Draft a customer support response using the configured LLM.
 */
export async function responseDraft(input: ResponseDraftInput): Promise<ResponseDraftResult> {
  const client = new OpenAI({
    baseURL: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
  });

  const toneInstruction = input.tone === "concise"
    ? "Keep the response very brief — 1-2 sentences max."
    : input.tone === "empathetic"
      ? "Use a warm, understanding tone. Acknowledge the customer's frustration."
      : "Use a professional, straightforward tone.";

  const response = await client.chat.completions.create({
    model: config.llm.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Customer message: "${input.customer_message}"

Context from our systems:
${input.context}

Tone: ${toneInstruction}

Draft a response:`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const draft = response.choices[0]?.message?.content || "Unable to generate response.";

  return {
    draft: draft.trim(),
    model: config.llm.model,
  };
}
