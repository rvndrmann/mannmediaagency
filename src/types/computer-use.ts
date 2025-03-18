
export interface ComputerAction {
  type: string;
  x?: number;
  y?: number;
  button?: "left" | "middle" | "right";
  text?: string;
  keys?: string[];
  scrollX?: number;
  scrollY?: number;
  url?: string;
  element_id?: string;
}

export interface SafetyCheck {
  id: string;
  code: string;
  message: string;
}

export interface ComputerCall {
  type: "computer_call";
  id: string;
  call_id: string;
  action: ComputerAction;
  pending_safety_checks: SafetyCheck[];
  status: "ready" | "completed" | "failed";
}

export interface ReasoningItem {
  type: "reasoning";
  id: string;
  summary: Array<{
    type: "summary_text";
    text: string;
  }>;
}

export interface TextItem {
  type: "text";
  text: string;
}

export type ComputerUseOutput = (ComputerCall | ReasoningItem | TextItem)[];

export interface ComputerSession {
  id: string;
  userId: string;
  status: string;
  taskDescription: string;
  environment: string;
  openai_response_id: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ComputerActionHistory {
  id: string;
  sessionId: string;
  actionType: string;
  actionDetails: ComputerAction;
  status: string;
  screenshotUrl: string | null;
  reasoning: string | null;
  createdAt: string;
  executedAt: string | null;
}

export interface ComputerSafetyCheck {
  id: string;
  sessionId: string;
  actionId: string | null;
  checkType: string;
  checkMessage: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}
