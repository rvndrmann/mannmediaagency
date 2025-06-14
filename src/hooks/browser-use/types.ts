
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
  };
  wssUrl?: string;
  cdpUrl?: string;
  browserInstancePath?: string;
  proxy?: string;
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
