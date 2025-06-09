
export interface BrowserTask {
  id?: string;
  input: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'created' | 'expired';
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
}

export interface UserCredits {
  credits_remaining: number;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'expired' | 'created';

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
}
