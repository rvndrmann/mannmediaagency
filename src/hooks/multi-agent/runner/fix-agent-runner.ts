
// Utility functions to check task status
export const isTaskPending = (status: string): boolean => {
  return status === 'pending';
};

export const isTaskInProgress = (status: string): boolean => {
  return status === 'in_progress' || status === 'in-progress';
};

export const isTaskCompleted = (status: string): boolean => {
  return status === 'completed';
};

export const isTaskFailed = (status: string): boolean => {
  return status === 'failed' || status === 'error';
};

// Helper to create properly typed messages
export const createTypedMessage = (props: {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  agentType?: string;
  status?: "thinking" | "completed" | "error";
}) => {
  return props;
};
