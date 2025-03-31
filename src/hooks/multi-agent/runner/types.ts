
export type AgentType = "main" | "script" | "image" | "tool" | "scene";

export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
}
