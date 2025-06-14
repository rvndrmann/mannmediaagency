
export interface BrowserTask {
  id?: string;
  input: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'created' | 'expired' | 'idle';
  output?: string;
  current_url?: string;
  live_url?: string;
  progress?: number;
  browser_data?: any;
  applications_config?: any;
  environment: 'browser' | 'desktop';
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  user_id: string;
  browser_task_id?: string;
}

export interface SensitiveDataItem {
  id: string;
  name: string;
  value: string;
  type: 'password' | 'email' | 'text' | 'number';
  key?: string;
}

export interface BrowserContextConfig {
  minWaitPageLoadTime?: number;
  waitForNetworkIdlePageLoadTime?: number;
  maxWaitPageLoadTime?: number;
  highlightElements?: boolean;
  viewportExpansion?: number;
  userAgent?: string;
  locale?: string;
  allowedDomains?: string[];
  browserWindowSize?: { width: number; height: number };
}

export interface BrowserConfig {
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  chromePath?: string;
  useOwnBrowser?: boolean;
  proxy?: string;
  resolution?: string;
  theme?: string;
  darkMode?: boolean;
  headless?: boolean;
  persistentSession?: boolean;
  disableSecurity?: boolean;
  extraChromiumArgs?: string[];
  contextConfig?: BrowserContextConfig;
  sensitiveData?: SensitiveDataItem[];
  desktopApps?: DesktopApplication[];
  chromeUserData?: string;
  taskTemplates?: any[];
  desktopTimeout?: number;
  streamDesktop?: boolean;
}

export interface UserCredits {
  credits_remaining: number;
  credits?: number;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'expired' | 'created' | 'idle';

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  timestamp: string;
  details?: any;
}

export interface BrowserTaskHistory {
  id: string;
  task_input: string;
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
  output?: any;
  browser_task_id?: string;
  result_url?: string;
  user_id?: string;
  screenshot_url?: string;
  browser_data?: any;
}

export interface BrowserTaskState {
  task: BrowserTask | null;
  isLoading: boolean;
  error: string | null;
  taskInput?: string;
  currentTaskId?: string;
  isProcessing?: boolean;
  taskStatus?: TaskStatus;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting' | 'error';
  liveUrl?: string;
  progress?: number;
  taskSteps?: TaskStep[];
  taskOutput?: string;
  currentUrl?: string;
  environment?: 'browser' | 'desktop';
  browserConfig?: BrowserConfig;
}

export interface BrowserUseError {
  message: string;
  code?: string;
  details?: any;
}

export interface DesktopApplication {
  id: string;
  name: string;
  executable: string;
  arguments?: string[];
  workingDirectory?: string;
}

export interface CaptureWebsiteResponse {
  success: boolean;
  screenshot_url?: string;
  image_url?: string;
  screenshot?: string;
  error?: string;
}
