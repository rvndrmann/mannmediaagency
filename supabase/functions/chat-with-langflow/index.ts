
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

    return JSON.parse(responseText);
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

    const response = await this.post(endpoint, payload);
    
    if (!response.outputs?.[0]?.outputs?.[0]?.outputs?.message?.text) {
      console.error('Invalid response format:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response format from Langflow');
    }

    return response.outputs[0].outputs[0].outputs.message.text;
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
