
export interface BrowserAutomationTask {
  id: string;
  user_id: string;
  input: string;
  browser_task_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused' | 'expired';
  output?: any;
  error_message?: string;
  current_url?: string;
  live_url?: string;
  environment: string;
  applications_config?: any;
  browser_data?: any;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface BrowserConfig {
  proxy?: {
    enabled: boolean;
    url?: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  cookiesEnabled?: boolean;
  javascriptEnabled?: boolean;
  headless?: boolean;
  useOwnBrowser?: boolean;
  chromePath?: string;
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  viewport?: {
    width: number;
    height: number;
  };
  extraHeaders?: Record<string, string>;
  extraParams?: Record<string, any>;
}

export interface BrowserTaskOptions {
  saveSessionData?: boolean;
  environment?: string;
  applicationConfig?: any;
}

export interface BrowserTaskResult {
  taskId: string;
  liveUrl?: string;
}

export interface BrowserTaskStatus {
  status: string;
  output?: any;
  error?: string;
}
