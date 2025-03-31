
import { EventEmitter } from 'events';

export class MCPClient {
  id: string;
  url: string;
  projectId: string;
  updateInterval: number;
  connected: boolean = false;
  socket: WebSocket | null = null;
  reconnectAttempts: number = 0;
  maxReconnectAttempts: number = 5;
  reconnectInterval: number = 5000;
  heartbeatTimer: number | null = null;
  eventEmitter: EventEmitter;

  constructor(id: string, url: string, projectId: string, updateInterval: number = 30000) {
    this.id = id;
    this.url = url;
    this.projectId = projectId;
    this.updateInterval = updateInterval;
    this.eventEmitter = new EventEmitter();
  }

  // Connect to the MCP server
  connect(): void {
    try {
      if (this.socket) {
        this.close();
      }

      console.log(`Connecting to MCP server: ${this.url}`);
      
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onclose = this.onClose.bind(this);
      this.socket.onerror = this.onError.bind(this);
    } catch (error) {
      console.error(`Error connecting to MCP server:`, error);
      this.scheduleReconnect();
    }
  }

  // Handle successful connection
  private onOpen(): void {
    console.log(`Connected to MCP server: ${this.url}`);
    this.connected = true;
    this.reconnectAttempts = 0;

    // Send initial project context
    this.sendProjectContext();

    // Start heartbeat
    this.startHeartbeat();

    // Emit connected event
    this.eventEmitter.emit('connected', { clientId: this.id });
  }

  // Handle incoming messages
  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log(`Received message from MCP server:`, data);

      // Handle different message types
      if (data.type === 'tool-result') {
        this.eventEmitter.emit('tool-result', data);
      } else if (data.type === 'status-update') {
        this.eventEmitter.emit('status-update', data);
      } else if (data.type === 'ping') {
        this.sendPong();
      }
    } catch (error) {
      console.error(`Error handling message from MCP server:`, error);
    }
  }

  // Handle connection close
  private onClose(event: CloseEvent): void {
    if (this.connected) {
      console.log(`Disconnected from MCP server: ${this.url}`, event);
      this.connected = false;
      this.stopHeartbeat();
      this.eventEmitter.emit('disconnected', { clientId: this.id, code: event.code });
      
      // Attempt to reconnect if not closed manually
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    }
  }

  // Handle connection error
  private onError(error: Event): void {
    console.error(`WebSocket error with MCP server: ${this.url}`, error);
    this.eventEmitter.emit('error', { clientId: this.id, error });
  }

  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * this.reconnectAttempts;
      
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect to MCP server (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached for MCP server: ${this.url}`);
      this.eventEmitter.emit('max-reconnect-attempts-reached', { clientId: this.id });
    }
  }

  // Start heartbeat interval
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.updateInterval);
  }

  // Stop heartbeat interval
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Send heartbeat to server
  private sendHeartbeat(): void {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'heartbeat', clientId: this.id, timestamp: Date.now() }));
    }
  }

  // Send pong response
  private sendPong(): void {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'pong', clientId: this.id, timestamp: Date.now() }));
    }
  }

  // Send project context to server
  sendProjectContext(): void {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ 
        type: 'set-context', 
        clientId: this.id, 
        context: { projectId: this.projectId } 
      }));
    }
  }

  // Execute a tool on the MCP server
  executeTool(toolName: string, params: any): void {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ 
        type: 'execute-tool', 
        clientId: this.id, 
        toolName, 
        params,
        context: { projectId: this.projectId } 
      }));
    } else {
      console.error(`Cannot execute tool: not connected to MCP server`);
      this.eventEmitter.emit('tool-error', { 
        clientId: this.id, 
        toolName, 
        error: 'Not connected to MCP server' 
      });
    }
  }

  // Close the connection
  close(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      // Remove event handlers to avoid memory leaks
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the connection if it's open
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, "Client disconnected");
      }
      
      this.socket = null;
    }
    
    this.connected = false;
  }

  // Subscribe to events
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  // Unsubscribe from events
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // Get connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Get client ID
  getClientId(): string {
    return this.id;
  }
}
