
import { Attachment } from "@/types/message";
import { ToolContext } from "../types";

export interface AgentResult {
  response: string | null;
  nextAgent: string | null;
}

export interface BaseAgent {
  run(input: string, attachments: Attachment[]): Promise<AgentResult>;
}
