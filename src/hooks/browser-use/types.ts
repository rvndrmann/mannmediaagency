
export interface BrowserConfig {
  headless: boolean;
  disableSecurity: boolean;
  useOwnBrowser: boolean;
  chromePath: string;
  persistentSession: boolean;
  resolution: string;
  theme: string;
  darkMode: boolean;
  sensitiveData: SensitiveDataItem[];
  contextConfig: {
    minWaitPageLoadTime: number;
    waitForNetworkIdlePageLoadTime: number;
    maxWaitPageLoadTime: number;
    highlightElements: boolean;
    viewportExpansion: number;
    userAgent?: string;
    locale?: string;
    allowedDomains?: string[];
  };
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  proxy?: string;
  extraChromiumArgs?: string[];
}

export interface SensitiveDataItem {
  id: string;
  key: string;
  name: string;
  value: string;
  type: 'text' | 'password' | 'email';
}

export interface BrowserTaskHistory {
  id: string;
  task_input: string;
  status: 'created' | 'running' | 'finished' | 'stopped' | 'paused' | 'failed';
  output: string | null;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  browser_task_id: string | null;
  result_url: string | null;
  screenshot_url: string | null;
  environment: 'browser' | 'desktop';
  browser_data: any;
}

export type TaskStatus = 'created' | 'running' | 'finished' | 'stopped' | 'paused' | 'failed';

export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  details?: string;
}

export interface BrowserTaskState {
  taskId: string;
  status: TaskStatus;
  progress: number;
  currentStep?: string;
  steps: TaskStep[];
  liveUrl?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  currentTaskId?: string;
  isProcessing?: boolean;
  taskStatus?: TaskStatus;
}

export interface BrowserTask {
  id: string;
  input: string;
  status: TaskStatus;
  output?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  environment?: 'browser' | 'desktop';
  browser_data?: any;
  applications_config?: any;
  browser_task_id?: string;
  current_url?: string;
  live_url?: string;
  progress?: number;
}

export interface UserCredits {
  credits_remaining: number;
  credits_used: number;
  last_updated: string;
}

export interface CaptureWebsiteResponse {
  success: boolean;
  screenshot_url?: string;
  image_url?: string;
  screenshot?: string;
  error?: string;
}
