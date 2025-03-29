
import { Message, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Validates an incoming message to ensure it meets minimal requirements
 */
export function validateMessage(message: Message): boolean {
  if (!message.id || !message.role || !message.createdAt) {
    console.warn("Message is missing required properties:", message);
    return false;
  }
  
  return true;
}

/**
 * Handles creating a system message for errors
 */
export function createErrorMessage(error: Error | string): Message {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return {
    id: uuidv4(),
    role: "system",
    content: `Error: ${errorMessage}`,
    createdAt: new Date().toISOString(),
    type: "error" as MessageType,
    status: "error"
  };
}

/**
 * Handles creating a system message for various system events
 */
export function createSystemMessage(content: string, type: MessageType = "system", status?: string): Message {
  return {
    id: uuidv4(),
    role: "system",
    content,
    createdAt: new Date().toISOString(),
    type,
    status
  };
}

/**
 * Creates a retry handler with exponential backoff
 */
export function createRetryHandler<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3,
  onError?: (error: Error, retryCount: number) => void
): Promise<T> {
  let retryCount = 0;
  
  const execute = async (): Promise<T> => {
    try {
      return await operation();
    } catch (err) {
      if (retryCount >= maxRetries) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (onError) onError(error, retryCount);
        throw error;
      }
      
      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`Retry ${retryCount}/${maxRetries} after ${delay}ms`);
      
      if (onError) onError(err instanceof Error ? err : new Error(String(err)), retryCount);
      
      return new Promise(resolve => {
        setTimeout(() => resolve(execute()), delay);
      });
    }
  };
  
  return execute();
}

/**
 * Helper function to show connection status in the UI
 */
export function handleConnectionError(error: Error | string, setMessages?: (fn: (prev: Message[]) => Message[]) => void): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  toast.error(`Connection issue: ${errorMessage}`);
  
  if (setMessages) {
    const systemErrorMessage = createErrorMessage(errorMessage);
    setMessages(prev => [...prev, systemErrorMessage]);
  }
}
