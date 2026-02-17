/**
 * Policy Search Tool
 *
 * Calls the Python RAG microservice to search policy documents.
 * This is the microservice boundary — TypeScript calls Python via HTTP.
 *
 * The RAG service embeds the query, does cosine similarity search in ChromaDB,
 * and returns the most relevant policy chunks. The agent then uses these
 * chunks as context to answer the customer's policy question.
 */

import { config } from "../config.js";

// ─── Response types matching the Python Pydantic models ──────────────────────

export interface PolicyChunk {
  text: string;
  source: string;
  score: number;
}

export interface PolicySearchResult {
  query: string;
  results: PolicyChunk[];
  total_chunks: number;
}

export interface PolicySearchInput {
  query: string;
  top_k?: number;
}

/**
 * Search policy documents via the RAG microservice.
 * Returns relevant policy chunks ranked by semantic similarity.
 */
export async function policySearch(input: PolicySearchInput): Promise<PolicySearchResult> {
  const url = `${config.rag.baseUrl}/search`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        top_k: input.top_k ?? 3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RAG service returned ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as PolicySearchResult;
    return data;
  } catch (error) {
    // If the RAG service is down, return a graceful error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        query: input.query,
        results: [],
        total_chunks: 0,
      };
    }

    // Re-throw if it's a different error (e.g., bad response)
    throw error;
  }
}
