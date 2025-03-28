
import { useState } from "react";
import { toast } from "sonner";
import { CanvasScene, SceneUpdateType } from "@/types/canvas";
import { AgentRunner } from "./multi-agent/runner/AgentRunner";
import { AgentType } from "./multi-agent/runner/types";
import { Message } from "@/types/message";

interface CanvasAgentConfig {
  projectId: string;
  sceneId?: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  saveFullScript?: (script: string) => Promise<void>;
  divideScriptToScenes?: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
}

export function useCanvasAgent(config: CanvasAgentConfig) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentType>("script");
  
  const processAgentRequest = async (
    request: string, 
    contextData: Record<string, any> = {},
    agent: AgentType = "script"
  ) => {
    try {
      setIsProcessing(true);
      setActiveAgent(agent);
      
      // Create a new conversation ID for this request
      const conversationId = `canvas-${config.projectId}-${Date.now()}`;
      
      // Add system message to explain context
      const initialMessages: Message[] = [
        {
          id: `system-${Date.now()}`,
          role: "system",
          content: `You are assisting with a video project in the Canvas. Project ID: ${config.projectId}. ${config.sceneId ? `Current scene: ${config.sceneId}` : 'Working with the full script.'}`,
          createdAt: new Date().toISOString(),
          type: "system"
        },
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: request,
          createdAt: new Date().toISOString(),
          type: "user"
        }
      ];
      
      setAgentMessages(initialMessages);
      
      // Create a runner for the selected agent
      const runner = new AgentRunner({
        initialAgentType: agent,
        enableDirectToolExecution: true,
        usePerformanceModel: false,
        tracingEnabled: true,
        contextMetadata: {
          canvasProjectId: config.projectId,
          canvasSceneId: config.sceneId,
          ...contextData
        }
      });
      
      let result = await runner.run(request, [], {
        onMessage: (message) => {
          setAgentMessages(prev => [...prev, message]);
        },
        onError: (error) => {
          toast.error(`Agent error: ${error}`);
          console.error("Agent error:", error);
        },
        onHandoffStart: (fromAgent, toAgent, reason) => {
          console.log(`Handoff from ${fromAgent} to ${toAgent}: ${reason}`);
          setActiveAgent(toAgent as AgentType);
        },
        onHandoffEnd: (agentType) => {
          console.log(`Handoff complete, now using ${agentType}`);
          setActiveAgent(agentType as AgentType);
        },
        onToolExecution: (toolName, params) => {
          console.log(`Executing tool: ${toolName}`, params);
        }
      });
      
      if (result) {
        // Process the result based on agent type and update the canvas
        await processAgentResult(result, agent);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error("Error processing canvas agent request:", error);
      toast.error("Failed to process agent request");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  const processAgentResult = async (result: any, agent: AgentType) => {
    if (!result || !result.response) return;
    
    try {
      // Look for structured data in the response
      if (result.structured_output) {
        await handleStructuredOutput(result.structured_output, agent);
      } else {
        // Try to parse the response for content updates
        await parseResponseForCanvasUpdates(result.response, agent);
      }
    } catch (error) {
      console.error("Error processing agent result:", error);
      toast.error("Failed to apply agent changes to canvas");
    }
  };
  
  const handleStructuredOutput = async (output: any, agent: AgentType) => {
    if (!output) return;
    
    // Handle full script update
    if (output.fullScript && config.saveFullScript) {
      await config.saveFullScript(output.fullScript);
      toast.success("Updated full script");
    }
    
    // Handle scene script update
    if (output.sceneScript && config.sceneId) {
      await config.updateScene(config.sceneId, 'script', output.sceneScript);
      toast.success("Updated scene script");
    }
    
    // Handle scene description update
    if (output.sceneDescription && config.sceneId) {
      await config.updateScene(config.sceneId, 'description', output.sceneDescription);
      toast.success("Updated scene description");
    }
    
    // Handle image prompt update
    if (output.imagePrompt && config.sceneId) {
      await config.updateScene(config.sceneId, 'imagePrompt', output.imagePrompt);
      toast.success("Updated image prompt");
    }
    
    // Handle multiple scene updates
    if (output.sceneUpdates && Array.isArray(output.sceneUpdates) && config.divideScriptToScenes) {
      await config.divideScriptToScenes(output.sceneUpdates);
      toast.success("Updated multiple scenes");
    }
  };
  
  const parseResponseForCanvasUpdates = async (response: string, agent: AgentType) => {
    if (!response || !config.sceneId) return;
    
    // Common section markers in AI responses
    const scriptMarkers = [
      { start: "## SCRIPT", end: "##" },
      { start: "SCRIPT:", end: "\n\n" },
      { start: "```script", end: "```" },
      { start: "Scene Script:", end: "\n\n" }
    ];
    
    const descriptionMarkers = [
      { start: "## DESCRIPTION", end: "##" },
      { start: "DESCRIPTION:", end: "\n\n" },
      { start: "```description", end: "```" },
      { start: "Scene Description:", end: "\n\n" }
    ];
    
    const imagePromptMarkers = [
      { start: "## IMAGE PROMPT", end: "##" },
      { start: "IMAGE PROMPT:", end: "\n\n" },
      { start: "```image-prompt", end: "```" },
      { start: "Scene Image Prompt:", end: "\n\n" }
    ];
    
    // Helper function to extract content between markers
    const extractContent = (text: string, markers: { start: string, end: string }[]): string | null => {
      for (const { start, end } of markers) {
        const startIndex = text.indexOf(start);
        if (startIndex !== -1) {
          const contentStart = startIndex + start.length;
          const endIndex = text.indexOf(end, contentStart);
          if (endIndex !== -1) {
            return text.substring(contentStart, endIndex).trim();
          } else {
            // If end marker not found, take the rest of the text
            return text.substring(contentStart).trim();
          }
        }
      }
      return null;
    };
    
    // Extract content for each type
    const scriptContent = extractContent(response, scriptMarkers);
    const descriptionContent = extractContent(response, descriptionMarkers);
    const imagePromptContent = extractContent(response, imagePromptMarkers);
    
    // Update canvas with extracted content
    if (scriptContent && agent === "script") {
      await config.updateScene(config.sceneId, 'script', scriptContent);
      toast.success("Script updated from agent response");
    }
    
    if (descriptionContent) {
      await config.updateScene(config.sceneId, 'description', descriptionContent);
      toast.success("Description updated from agent response");
    }
    
    if (imagePromptContent) {
      await config.updateScene(config.sceneId, 'imagePrompt', imagePromptContent);
      toast.success("Image prompt updated from agent response");
    }
    
    // If no structured content was found but this is a script agent, use the full response
    if (!scriptContent && !descriptionContent && !imagePromptContent && agent === "script") {
      // First check if this looks like a script (dialogue format, character names, etc.)
      const looksLikeScript = /[A-Z]+:|\([^)]+\)|FADE IN:|CUT TO:/.test(response);
      if (looksLikeScript) {
        await config.updateScene(config.sceneId, 'script', response);
        toast.success("Script updated from agent response");
      }
    }
  };
  
  // Generate a complete script for the selected scene
  const generateSceneScript = async (sceneId: string, context: string = "") => {
    return processAgentRequest(
      `Generate a detailed script for scene ${sceneId}. ${context}`, 
      { targetField: 'script', sceneId },
      'script'
    );
  };
  
  // Generate an image prompt for the selected scene
  const generateImagePrompt = async (sceneId: string, context: string = "") => {
    return processAgentRequest(
      `Generate a detailed image prompt for scene ${sceneId} that captures the visual essence of the scene. ${context}`, 
      { targetField: 'imagePrompt', sceneId },
      'image'
    );
  };
  
  // Generate a description for the selected scene
  const generateSceneDescription = async (sceneId: string, context: string = "") => {
    return processAgentRequest(
      `Write a concise but detailed description for scene ${sceneId}. ${context}`, 
      { targetField: 'description', sceneId },
      'scene'
    );
  };
  
  // Divide a full script into multiple scenes
  const divideScript = async (fullScript: string, sceneIds: string[]) => {
    return processAgentRequest(
      `Divide this script into ${sceneIds.length} distinct scenes:\n\n${fullScript}`, 
      { targetField: 'multipleScenes', sceneIds },
      'script'
    );
  };
  
  return {
    isProcessing,
    agentMessages,
    activeAgent,
    processAgentRequest,
    generateSceneScript,
    generateImagePrompt,
    generateSceneDescription,
    divideScript
  };
}
