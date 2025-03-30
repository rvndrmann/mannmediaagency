
export type AgentType = "main" | "script" | "image" | "scene" | "tool" | "data" | string;

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  systemPrompt: string;
  defaultInstructions: string;
  isEnabled: boolean;
}
