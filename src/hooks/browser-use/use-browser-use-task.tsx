
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BrowserTaskState, TaskStep, TaskStatus, UserCredits, BrowserConfig, BrowserTheme } from "./types";
import { useTaskOperations } from "./use-task-operations";
import { useScreenshot } from "./use-screenshot";
import { useTaskMonitoring } from "./use-task-monitoring";
import { useUserData } from "./use-user-data";

const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  // Basic settings
  persistentSession: false,
  useOwnBrowser: false,
  resolution: "1920x1080",
  theme: "Ocean",
  darkMode: false,
  
  // Core settings
  headless: false,
  disableSecurity: true,
  
  // Context configuration
  contextConfig: {
    // Default page load settings
    minWaitPageLoadTime: 0.5,
    waitForNetworkIdlePageLoadTime: 1.0,
    maxWaitPageLoadTime: 5.0,
    
    // Default display settings
    browserWindowSize: { width: 1280, height: 1100 },
    highlightElements: true,
    viewportExpansion: 500
  }
};

// Validate browser config to ensure all required fields are present
const validateConfig = (config: BrowserConfig): BrowserConfig => {
  const validConfig = { ...DEFAULT_BROWSER_CONFIG };
  
  // Copy over user settings, using defaults for missing values
  Object.keys(config).forEach(key => {
    validConfig[key] = config[key];
  });
  
  // Ensure contextConfig exists and has required fields
  if (!validConfig.contextConfig) {
    validConfig.contextConfig = { ...DEFAULT_BROWSER_CONFIG.contextConfig };
  } else {
    validConfig.contextConfig = {
      ...DEFAULT_BROWSER_CONFIG.contextConfig,
      ...validConfig.contextConfig
    };
  }
  
  return validConfig;
};

export function useBrowserUseTask() {
  const [taskInput, setTaskInput] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [taskOutput, setTaskOutput] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserConfig, setBrowserConfig] = useState<BrowserConfig>(DEFAULT_BROWSER_CONFIG);

  // Try to load saved browser config from localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('browserUseConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setBrowserConfig(validateConfig(parsedConfig));
      }
    } catch (err) {
      console.error("Error loading saved browser config:", err);
    }
  }, []);

  // Save browser config to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('browserUseConfig', JSON.stringify(browserConfig));
    } catch (err) {
      console.error("Error saving browser config:", err);
    }
  }, [browserConfig]);

  // Safely update browser config
  const updateBrowserConfig = useCallback((newConfig: BrowserConfig) => {
    setBrowserConfig(validateConfig(newConfig));
  }, []);

  const state: BrowserTaskState = {
    taskInput,
    currentTaskId,
    isProcessing,
    progress,
    taskSteps,
    taskOutput,
    taskStatus,
    currentUrl,
    screenshot,
    userCredits,
    error,
    browserConfig
  };

  const stateSetters = {
    setTaskInput,
    setCurrentTaskId,
    setIsProcessing,
    setProgress,
    setTaskSteps,
    setTaskOutput,
    setTaskStatus,
    setCurrentUrl,
    setScreenshot,
    setUserCredits,
    setError,
    setBrowserConfig: updateBrowserConfig
  };

  // Use the refactored hooks
  const { startTask, pauseTask, resumeTask, stopTask } = useTaskOperations(
    state,
    stateSetters
  );

  const { captureScreenshot } = useScreenshot(
    currentUrl,
    setScreenshot,
    setError
  );

  // Set up task monitoring
  useTaskMonitoring(
    state,
    {
      setProgress,
      setTaskStatus,
      setCurrentUrl,
      setTaskSteps,
      setTaskOutput,
      setIsProcessing
    }
  );

  // Fetch user data
  useUserData(setUserCredits, setError);
  
  return {
    taskInput,
    setTaskInput,
    currentTaskId,
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    progress,
    taskSteps,
    taskOutput,
    taskStatus,
    currentUrl,
    setCurrentUrl,
    screenshot,
    captureScreenshot,
    userCredits,
    error,
    browserConfig,
    setBrowserConfig: updateBrowserConfig
  };
}
