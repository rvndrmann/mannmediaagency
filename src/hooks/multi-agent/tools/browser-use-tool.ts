
import { ToolDefinition, ToolResult, ToolContext } from "../types";
import { Command } from "@/types/message";
import { BrowserConfig, SensitiveDataItem } from "@/hooks/browser-use/types";

// Default configuration
const defaultBrowserConfig: BrowserConfig = {
  headless: false,
  disableSecurity: false,
  useOwnBrowser: false,
  chromePath: "",
  persistentSession: true,
  resolution: "1920x1080",
  theme: "Ocean",
  darkMode: false,
  contextConfig: {
    minWaitPageLoadTime: 0.5,
    waitForNetworkIdlePageLoadTime: 5.0,
    maxWaitPageLoadTime: 15.0,
    highlightElements: true,
    viewportExpansion: 500
  }
};

// Process task text by replacing sensitive data placeholders
const processTaskWithSensitiveData = (task: string, sensitiveData?: SensitiveDataItem[]): string => {
  if (!sensitiveData || sensitiveData.length === 0) return task;
  
  let processedTask = task;
  sensitiveData.forEach(item => {
    const placeholder = `{${item.key}}`;
    const regex = new RegExp(placeholder, 'g');
    processedTask = processedTask.replace(regex, item.value);
  });
  
  return processedTask;
};

export const browserUseTool: ToolDefinition = {
  name: "browser-use",
  description: "Automates browser tasks like navigating websites, filling forms, taking screenshots, and more",
  requiredCredits: 1,
  parameters: [
    {
      name: "task",
      type: "string",
      description: "Description of the browser task to perform",
      required: true,
      prompt: "Describe the browser task in detail (e.g., 'Go to wikipedia.org and take a screenshot of the main page')"
    },
    {
      name: "browserConfig",
      type: "object",
      description: "Optional browser configuration options",
      required: false
    }
  ],
  
  async execute(command: Command, context: ToolContext): Promise<ToolResult> {
    try {
      const task = command.parameters.task as string;
      const userBrowserConfig = command.parameters.browserConfig as Partial<BrowserConfig> || {};
      
      if (!task) {
        return {
          success: false,
          message: "Task description is required"
        };
      }
      
      // Merge user provided config with defaults
      const browserConfig: BrowserConfig = {
        ...defaultBrowserConfig,
        ...userBrowserConfig
      };
      
      // Process the task with sensitive data
      const processedTask = processTaskWithSensitiveData(task, browserConfig.sensitiveData);
      
      // Add a note indicating that placeholders were replaced
      const hasPlaceholders = task.match(/\{([^}]+)\}/g);
      let placeholdersNote = "";
      if (hasPlaceholders && browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0) {
        placeholdersNote = "\n\nNote: Sensitive data placeholders have been securely replaced.";
      }
      
      // Execute the browser task
      const { data, error } = await context.supabase.functions.invoke("browser-use-api", {
        body: { 
          task: processedTask,
          environment: "browser",
          browser_config: browserConfig
        }
      });
      
      if (error) {
        console.error("Error starting browser task:", error);
        return {
          success: false,
          message: `Failed to start browser task: ${error.message || "Unknown error"}`
        };
      }
      
      return {
        success: true,
        message: `Browser task started successfully. Task ID: ${data.taskId}${placeholdersNote}`,
        data: {
          taskId: data.taskId,
          liveUrl: data.liveUrl
        }
      };
    } catch (error) {
      console.error("Error executing browser task:", error);
      return {
        success: false,
        message: `Error executing browser task: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
};
