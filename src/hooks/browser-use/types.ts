
export type TaskStatus = 'idle' | 'pending' | 'created' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed' | 'expired' | 'finished';

export interface TaskStep {
  id: string;
  description: string;
  status: string;
  timestamp?: string;
  details?: any;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface DesktopApplication {
  name: string;
  path: string;
  description?: string;
  icon?: string;
  arguments?: string[];
  isDefault?: boolean;
}

export interface DesktopShortcut {
  name: string;
  description: string;
  commands: string[];
  isEnabled: boolean;
}

export interface DesktopConfig {
  applications: DesktopApplication[];
  shortcuts: DesktopShortcut[];
  defaultTerminal?: string;
  defaultBrowser?: string;
  automationLevel: "basic" | "advanced" | "full";
  sessionTimeout: number; // in minutes
  streamDesktop: boolean;
  allowFileSystem: boolean;
  allowNetworkAccess: boolean;
}

export interface BrowserConfig {
  // Browser core settings
  headless: boolean;
  disableSecurity: boolean;
  useOwnBrowser: boolean;
  chromePath: string;
  chromeUserData?: string;
  persistentSession: boolean;
  
  // Display and resolution settings
  resolution: string;
  theme: string;
  darkMode: boolean;
  
  // Connection methods (new)
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  
  // Advanced settings
  proxy?: string;
  extraChromiumArgs?: string[];
  
  // Desktop automation settings
  desktopApps?: DesktopApplication[];
  taskTemplates?: string[];
  desktopTimeout?: number;
  streamDesktop?: boolean;
  
  // Context configuration
  contextConfig?: {
    minWaitPageLoadTime?: number;
    waitForNetworkIdlePageLoadTime?: number;
    maxWaitPageLoadTime?: number;
    browserWindowSize?: { width: number; height: number };
    highlightElements?: boolean;
    viewportExpansion?: number;
    locale?: string;
    userAgent?: string;
    allowedDomains?: string[] | string;
    saveRecordingPath?: string;
    tracePath?: string;
    cookiesFile?: string;
  };
}

export interface BrowserUseError {
  message: string;
  code?: string;
  details?: any;
}

export interface BrowserTaskState {
  taskInput: string;
  currentTaskId: string | null;
  isProcessing: boolean;
  progress: number;
  taskSteps: TaskStep[];
  taskOutput: string | null;
  taskStatus: TaskStatus;
  currentUrl: string | null;
  error: string | null;
  browserConfig: BrowserConfig;
  liveUrl: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  environment: 'browser' | 'desktop';
}

export interface BrowserTaskHistory {
  id: string;
  user_id: string;
  task_input: string;
  output: string | null;
  status: string;
  browser_task_id: string | null;
  screenshot_url: string | null;
  result_url: string | null;
  browser_data: any;
  created_at: string;
  completed_at: string | null;
  environment: string;
}

export interface CaptureWebsiteResponse {
  success?: boolean;
  error?: string;
  image_url?: string;
  screenshot?: string;
}

export interface StateSetters {
  setTaskInput: (value: string) => void;
  setCurrentTaskId: (value: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setProgress: (value: number) => void;
  setTaskSteps: (value: TaskStep[]) => void;
  setTaskOutput: (value: string | null) => void;
  setTaskStatus: (value: TaskStatus) => void;
  setCurrentUrl: (value: string | null) => void;
  setUserCredits: (value: UserCredits | null) => void;
  setError: (value: string | null) => void;
  setBrowserConfig: (value: BrowserConfig) => void;
  setLiveUrl: (value: string | null) => void;
  setConnectionStatus: (value: "disconnected" | "connecting" | "connected" | "error") => void;
  setEnvironment: (value: 'browser' | 'desktop') => void;
}

// Define a mapping of task status values to user-friendly display strings
export const taskStatusDisplayMap: Record<TaskStatus, string> = {
  idle: 'Idle',
  pending: 'Pending',
  created: 'Created',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped',
  failed: 'Failed',
  expired: 'Expired',
  finished: 'Finished'
};
