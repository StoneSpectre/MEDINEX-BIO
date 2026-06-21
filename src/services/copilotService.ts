import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Step 10 stub values for now
const DEFAULT_TENANT_ID = "demo-tenant-123";
const DEFAULT_USER_ID = "dr-smith-456";

export interface CopilotResponse {
  answer: string;
  sources: string[];
  metrics: {
    total_time_ms: number;
    tokens_used: number;
  };
}

export const copilotService = {
  createSession: async (): Promise<{ session_id: string }> => {
    // Mocking session creation so the UI works without the heavy Docker backend
    return { session_id: "mock-session-" + Date.now() };
  },

  askQuestion: async (sessionId: string, query: string): Promise<CopilotResponse> => {
    // Mocking the AI response so the user can test the UI and see the multi-agent pipeline animation
    return new Promise(resolve => setTimeout(() => {
      resolve({
        answer: "This is a simulated response from the Research Copilot. The actual backend requires PostgreSQL, Redis, Qdrant, Neo4j, and the Anthropic API to be actively running. Since the full multi-agent Docker stack is not running right now, I am providing this mock response so you can test the UI flow!",
        sources: ["Simulated Knowledge Graph", "Mock Vector DB"],
        metrics: {
          total_time_ms: 7100,
          tokens_used: 1240
        }
      });
    }, 100)); // We return quickly because ResearchCopilot.tsx has a hardcoded 7000ms visual pipeline simulation
  }
};
