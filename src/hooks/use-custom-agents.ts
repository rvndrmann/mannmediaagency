
import { AgentIconType, AgentInfo } from "@/types/message";

export interface CustomAgentFormData {
  id?: string;
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
}

// Placeholder for future implementation
export const useCustomAgents = () => {
  // This will be implemented later
  return {
    agents: [] as AgentInfo[],
    addAgent: (data: CustomAgentFormData) => {},
    updateAgent: (id: string, data: CustomAgentFormData) => {},
    deleteAgent: (id: string) => {},
    getAgent: (id: string) => null as AgentInfo | null
  };
};
