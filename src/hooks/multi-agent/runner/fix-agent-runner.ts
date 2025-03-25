
// Helper functions for AgentRunner.ts

export const isTaskInProgress = (task: any) => task.status === 'in_progress';
export const isTaskCompleted = (task: any) => task.status === 'completed';
export const isTaskFailed = (task: any) => task.status === 'failed' || task.status === 'error';
export const isTaskPending = (task: any) => task.status === 'pending';

export const createTypedMessage = (data: any) => {
  return data;
};

export const safeJsonParse = (text: string, fallback: any = {}) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return fallback;
  }
};

export const safeJsonStringify = (data: any, fallback: string = '{}') => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error('Error stringifying JSON:', e);
    return fallback;
  }
};

export const handleBrowserUseApiResponse = (response: any) => {
  // Process API response
  return response;
};

export const createTask = (name: string, description: string = `Executing ${name}`) => {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    status: 'pending' as const
  };
};
