
interface LangflowMessageProperties {
  text_color: string;
  background_color: string;
  edited: boolean;
  source: {
    id: string;
    display_name: string;
    source: string;
  };
  icon: string;
  allow_markdown: boolean;
  state: string;
  targets: string[];
}

interface LangflowMessage {
  timestamp: string;
  sender: string;
  sender_name: string;
  session_id: string;
  text: string;
  files: any[];
  error: boolean;
  edit: boolean;
  properties: LangflowMessageProperties;
  category: string;
  content_blocks: any[];
}

interface LangflowResponse {
  session_id: string;
  outputs: Array<{
    inputs: {
      input_value: string;
    };
    outputs: Array<{
      results: {
        message: LangflowMessage;
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
    console.log('Making request to:', url);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Langflow API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Raw response:', JSON.stringify(responseData, null, 2));
    return responseData;
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
    console.log('Parsed response:', response);
    
    if (!response?.outputs?.[0]?.outputs?.[0]?.results?.message?.text) {
      console.error('Invalid response format:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from Langflow');
    }

    return response.outputs[0].outputs[0].results.message.text;
  }
}
