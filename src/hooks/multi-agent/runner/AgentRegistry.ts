
import { AgentType, AgentOptions, RunnerContext, AgentResult, BaseAgent } from "../types";
import { MainAgent } from "./agents/MainAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { SceneCreatorAgent } from "./agents/SceneCreatorAgent";
import { DataAgent } from "./agents/DataAgent";

export class AgentRegistry {
  private static agents: Record<AgentType, any> = {
    "main": MainAgent,
    "script": ScriptWriterAgent,
    "image": ImageGeneratorAgent,
    "tool": ToolAgent,
    "scene": SceneCreatorAgent,
    "data": DataAgent
  };

  static registerAgent(agentType: AgentType, agentClass: any) {
    AgentRegistry.agents[agentType] = agentClass;
  }

  static createAgent(agentType: AgentType, options: AgentOptions): BaseAgent {
    const AgentClass = AgentRegistry.agents[agentType];
    if (!AgentClass) {
      console.error(`Agent type ${agentType} not found in registry`);
      // Return a mock agent that implements BaseAgent interface
      return {
        run: async () => ({
          response: "Agent not found",
          output: "Agent not found",
          nextAgent: null
        }),
        getType: () => agentType
      };
    }
    return new AgentClass(options);
  }

  static async runAgent(agentType: AgentType, input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      const agent = AgentRegistry.createAgent(agentType, {
        name: `${agentType} Agent`,
        instructions: `You are a helpful AI ${agentType} agent.`,
        context: context
      });

      if (!agent || typeof agent.run !== 'function') {
        console.error(`Invalid agent or missing run method for type: ${agentType}`);
        return {
          response: "Agent not found for type: " + agentType,
          output: "Agent not found for type: " + agentType,
          nextAgent: null
        };
      }

      return await agent.run(input, context);
    } catch (error) {
      console.error(`Error running agent of type ${agentType}:`, error);
      return {
        response: "Agent error for type: " + agentType,
        output: "Agent error for type: " + agentType,
        nextAgent: null
      };
    }
  }

  static getAgentClass(agentType: AgentType): any | null {
    if (!AgentRegistry.agents[agentType]) {
      console.warn(`No agent class registered for type: ${agentType}`);
      return null;
    }
    return AgentRegistry.agents[agentType];
  }

  static getAgentTypes(): AgentType[] {
    return Object.keys(AgentRegistry.agents) as AgentType[];
  }

  static hasAgentType(agentType: AgentType): boolean {
    return !!AgentRegistry.agents[agentType];
  }
}
