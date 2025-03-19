
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BrowserTaskState, TaskStep, TaskStatus, UserCredits, BrowserConfig, BrowserTheme } from "./types";
import { useTaskOperations } from "./use-task-operations";
import { useScreenshot } from "./use-screenshot";
import { useTaskMonitoring } from "./use-task-monitoring";
import { useUserData } from "./use-user-data";

const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  persistentSession: false,
  useOwnBrowser: false,
  resolution: "1920x1080",
  theme: "Ocean",
  darkMode: false
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
        setBrowserConfig(parsedConfig);
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
    setBrowserConfig
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
    setBrowserConfig
  };
}
