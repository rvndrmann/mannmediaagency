
interface LangflowResponse {
  outputs?: Array<{
    outputs: Array<{
      outputs: {
        message: {
          text: string;
        };
      };
    }>;
  }>;
}

export class LangflowClient {
  private baseURL: string;
  private applicationToken: string;

  constructor(baseURL: string, applicationToken: string) {
    this.baseURL = baseURL;
    this.applicationToken = applicationToken;
  }

  private async post(endpoint: string, body: any) {
    const headers = {
      "Authorization": `Bearer ${this.applicationToken}`,
      "Content-Type": "application/json"
    };

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Langflow API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async chat(flowId: string, langflowId: string, message: string) {
    const endpoint = `/lf/${langflowId}/api/v1/run/${flowId}`;
    const tweaks = {
      "Agent-swaq6": {},
      "ChatInput-SylqI": {},
      "ChatOutput-E57mu": {},
      "Agent-Hpbdi": {},
      "Agent-JogPZ": {}
    };

    const payload = {
      input_value: message,
      input_type: "chat",
      output_type: "chat",
      tweaks
    };

    const response = await this.post(endpoint, payload) as LangflowResponse;
    
    if (!response.outputs?.[0]?.outputs?.[0]?.outputs?.message?.text) {
      throw new Error('Invalid response format from Langflow');
    }

    return response.outputs[0].outputs[0].outputs.message.text;
  }
}
