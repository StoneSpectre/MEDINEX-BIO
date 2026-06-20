import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
    const response = await axios.post(`${API_BASE_URL}/copilot/session`, {
      tenant_id: DEFAULT_TENANT_ID,
      user_id: DEFAULT_USER_ID
    }, {
      headers: { Authorization: "Bearer demo-token" }
    });
    return response.data;
  },

  askQuestion: async (sessionId: string, query: string): Promise<CopilotResponse> => {
    const response = await axios.post(`${API_BASE_URL}/copilot/ask`, {
      query,
      session_id: sessionId,
      tenant_id: DEFAULT_TENANT_ID,
      user_id: DEFAULT_USER_ID
    }, {
      headers: { Authorization: "Bearer demo-token" }
    });
    return response.data;
  }
};
