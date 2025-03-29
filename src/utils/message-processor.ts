
import { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

/**
 * MessageProcessor helps manage message queues and processing
 * to avoid race conditions and duplicate messages
 */
export class MessageProcessor {
  private processedIds: Set<string> = new Set();
  private messageQueue: Message[] = [];
  private isProcessing: boolean = false;
  
  /**
   * Add a message to the processing queue if it hasn't been processed yet
   */
  public addMessage(message: Message): boolean {
    if (this.processedIds.has(message.id)) {
      console.log("Message already processed, skipping:", message.id);
      return false;
    }
    
    this.processedIds.add(message.id);
    this.messageQueue.push(message);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return true;
  }
  
  /**
   * Set callback to handle messages as they're processed
   */
  public setMessageHandler(handler: (messages: Message[]) => void): void {
    this.messageHandler = handler;
  }
  
  /**
   * Clear the processor state
   */
  public clear(): void {
    this.processedIds.clear();
    this.messageQueue = [];
    this.isProcessing = false;
  }
  
  /**
   * Check if a message has been processed
   */
  public hasProcessed(messageId: string): boolean {
    return this.processedIds.has(messageId);
  }
  
  /**
   * Track message IDs without adding to queue
   */
  public trackMessageId(messageId: string): void {
    this.processedIds.add(messageId);
  }
  
  /**
   * Process the message queue in batches
   */
  private processQueue(): void {
    if (this.messageQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    
    // Process up to 3 messages at a time
    const batch = this.messageQueue.splice(0, 3);
    
    if (batch.length > 0 && this.messageHandler) {
      this.messageHandler(batch);
    }
    
    // Continue processing after a small delay
    setTimeout(() => this.processQueue(), 50);
  }
  
  private messageHandler: ((messages: Message[]) => void) | null = null;
}
