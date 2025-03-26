
import { useState, useCallback, useEffect } from "react";
import { BrowserTaskState, TaskStep, TaskStatus, UserCredits, BrowserConfig, BrowserUseError, DesktopApplication } from "./types";
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
  chromePath: "",
  chromeUserData: "",
  extraChromiumArgs: [],
  
  // Connection methods
  wssUrl: "",
  cdpUrl: "",
  browserInstancePath: "",
  
  // Desktop automation settings
  desktopApps: [],
  taskTemplates: [],
  desktopTimeout: 30,
  streamDesktop: false,
  
  // Context configuration
  contextConfig: {
    // Default page load settings
    minWaitPageLoadTime: 0.5,
    waitForNetworkIdlePageLoadTime: 5.0,
    maxWaitPageLoadTime: 15.0,
    
    // Default display settings
    browserWindowSize: { width: 1280, height: 1100 },
    highlightElements: true,
    viewportExpansion: 500,
    
    // Optional settings
    userAgent: "",
    locale: "",
    allowedDomains: []
  }
};

// Validate browser config to ensure all required fields are present
const validateConfig = (config: BrowserConfig): BrowserConfig => {
  const validConfig = { ...DEFAULT_BROWSER_CONFIG };
  
  // Copy over user settings, using defaults for missing values
  Object.keys(config).forEach(key => {
    const typedKey = key as keyof BrowserConfig;
    if (typedKey in DEFAULT_BROWSER_CONFIG) {
      // Type assertion to handle the assignment
      (validConfig[typedKey] as unknown) = config[typedKey];
    }
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
  
  // Set browser window size from resolution if it exists
  if (validConfig.resolution) {
    const parts = validConfig.resolution.split('x');
    if (parts.length >= 2) {
      const width = parseInt(parts[0]);
      const height = parseInt(parts[1]);
      
      if (!isNaN(width) && !isNaN(height)) {
        validConfig.contextConfig.browserWindowSize = {
          width,
          height
        };
      }
    }
  }
  
  // Ensure desktop apps array exists
  if (!validConfig.desktopApps) {
    validConfig.desktopApps = [];
  }
  
  // Ensure task templates array exists
  if (!validConfig.taskTemplates) {
    validConfig.taskTemplates = [];
  }
  
  // Clean up empty string values for connection methods
  if (validConfig.wssUrl === "") validConfig.wssUrl = undefined;
  if (validConfig.cdpUrl === "") validConfig.cdpUrl = undefined;
  if (validConfig.browserInstancePath === "") validConfig.browserInstancePath = undefined;
  
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
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<BrowserTaskState["connectionStatus"]>("disconnected");
  const [environment, setEnvironment] = useState<'browser' | 'desktop'>('browser');

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

  // Update connection status based on task status
  useEffect(() => {
    if (!currentTaskId) {
      setConnectionStatus("disconnected");
      return;
    }
    
    if (isProcessing && ['pending', 'created'].includes(taskStatus)) {
      setConnectionStatus("connecting");
      return;
    }
    
    if (isProcessing && taskStatus === 'running') {
      setConnectionStatus("connected");
      return;
    }
    
    if (['failed', 'stopped'].includes(taskStatus)) {
      setConnectionStatus("error");
      return;
    }
    
    if (taskStatus === 'completed') {
      setConnectionStatus("disconnected");
      return;
    }
  }, [currentTaskId, isProcessing, taskStatus]);

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
    error,
    browserConfig,
    liveUrl,
    connectionStatus,
    environment
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
    setUserCredits,
    setError,
    setBrowserConfig: updateBrowserConfig,
    setLiveUrl,
    setConnectionStatus,
    setEnvironment
  };

  // Use the refactored hooks
  const { startTask, pauseTask, resumeTask, stopTask, restartTask } = useTaskOperations(
    state,
    stateSetters
  );

  // Use the screenshot hook
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
      setIsProcessing,
      setLiveUrl,
      setError,
      setConnectionStatus
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
    restartTask,
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
    setBrowserConfig: updateBrowserConfig,
    liveUrl,
    connectionStatus,
    environment,
    setEnvironment
  };
}
