
/**
 * A simple event emitter implementation for browser environments
 * to replace Node.js EventEmitter
 */
export class BrowserEventEmitter {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  /**
   * Register an event listener
   */
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  /**
   * Unregister an event listener
   */
  off(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      return;
    }
    
    const index = this.events[event].indexOf(listener);
    if (index !== -1) {
      this.events[event].splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }
    
    // Make a copy to avoid problems if listeners are added/removed during emit
    const listeners = [...this.events[event]];
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event, or all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}
