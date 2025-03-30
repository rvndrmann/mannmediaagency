
export interface MCPToolParameters {
  sceneId?: string;
  imageAnalysis?: boolean;
  useDescription?: boolean;
  productShotVersion?: string;
  aspectRatio?: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResponse {
  success: boolean;
  result?: string;
  error?: string;
  [key: string]: any;
}
