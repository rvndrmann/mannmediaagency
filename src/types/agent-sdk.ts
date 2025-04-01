import { VideoProject, VideoScene } from './video-project';

export interface AgentSDKConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface AgentFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface AgentContext {
  project?: VideoProject;
  scene?: VideoScene;
  userInput?: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface AgentSDK {
  initialize(config: AgentSDKConfig): Promise<void>;
  registerFunction(fn: AgentFunction): void;
  executeFunction(name: string, params: any, context?: AgentContext): Promise<AgentResponse>;
  cleanup(): Promise<void>;
}