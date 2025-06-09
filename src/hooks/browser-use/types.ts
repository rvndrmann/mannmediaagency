
export interface BrowserTask {
  id?: string;
  input: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused';
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

export interface BrowserConfig {
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  chromePath?: string;
  useOwnBrowser?: boolean;
  proxy?: string;
}

export interface UserCredits {
  credits_remaining: number;
}
