
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID");
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LangflowMessage {
  timestamp: string;
  sender: string;
  sender_name: string;
  session_id: string;
  text: string;
  files: any[];
  error: boolean;
  edit: boolean;
  properties: {
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
  };
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

class LangflowClient {
  private baseURL: string;
  private applicationToken: string;

  constructor(baseURL: string, applicationToken: string) {
    this.baseURL = baseURL;
    this.applicationToken = applicationToken;
  }

  private async post(endpoint: string, body: any) {
    console.log('Making request to:', `${this.baseURL}${endpoint}`);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const headers = {
      "Authorization": `Bearer ${this.applicationToken}`,
      "Content-Type": "application/json"
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} - ${responseText}`);
    }

    try {
      const responseData = JSON.parse(responseText);
      console.log('Parsed response data:', JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      console.error('Error parsing response:', error);
      throw new Error(`Failed to parse Langflow response: ${error.message}`);
    }
  }

  async chat(message: string) {
    if (!LANGFLOW_ID || !FLOW_ID) {
      throw new Error('Missing required configuration');
    }

    const endpoint = `/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
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
    
    if (!response?.outputs?.[0]?.outputs?.[0]?.results?.message?.text) {
      console.error('Invalid response format:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from Langflow');
    }

    const messageText = response.outputs[0].outputs[0].results.message.text;
    console.log('Extracted message text:', messageText);
    return messageText;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!APPLICATION_TOKEN || !BASE_API_URL) {
      throw new Error('Missing required environment variables');
    }

    const client = new LangflowClient(BASE_API_URL, APPLICATION_TOKEN);
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array is required');
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('Invalid request: no message content found');
    }

    console.log('Processing message:', lastMessage.content);
    const response = await client.chat(lastMessage.content);

    return new Response(
      JSON.stringify({ message: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
