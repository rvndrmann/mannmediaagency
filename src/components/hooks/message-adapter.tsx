
import React from 'react';
import { Message } from '@/types/message';

/**
 * This utility helps adapt messages between different component types
 * when the global Message type and component-specific Message types 
 * have incompatible role definitions.
 */

// Define a SimpleMessage type that components expect
export interface SimpleMessage {
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "completed" | "error";
  id: string; // Changed from optional to required
  createdAt: string; // Changed from optional to required
}

// Simple message adapter for components that expect only 'user' and 'assistant' roles
export const adaptMessagesForComponents = (messages: Message[]): SimpleMessage[] => {
  // Filter out messages with incompatible roles for certain components
  return messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' || msg.role === 'tool'
  ).map(msg => ({
    role: msg.role === 'system' || msg.role === 'tool' ? 'assistant' : msg.role,
    content: msg.content,
    status: msg.status,
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: msg.createdAt || new Date().toISOString()
  })) as SimpleMessage[];
};

// Adapter to convert complex Message to simple format expected by some components
export const adaptToSimpleMessage = (message: Message): SimpleMessage => {
  return {
    role: message.role === 'system' || message.role === 'tool' ? 'assistant' : message.role,
    content: message.content,
    status: message.status,
    id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: message.createdAt || new Date().toISOString()
  };
};

// HOC to wrap components that expect a specific Message type
export const withMessageAdapter = <P extends { messages: Message[] }>(
  Component: React.ComponentType<P>,
) => {
  return (props: P) => {
    const adaptedMessages = adaptMessagesForComponents(props.messages);
    return <Component {...props} messages={adaptedMessages as any} />;
  };
};

// Function to adapt any Message[] type to a component's expected format
export const adaptMessages = <T extends { role: string; content: string }>(
  messages: Message[]
): T[] => {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' || msg.role === 'tool')
    .map(msg => ({
      role: msg.role === 'system' || msg.role === 'tool' ? 'assistant' : msg.role,
      content: msg.content,
      status: msg.status,
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: msg.createdAt || new Date().toISOString()
    })) as unknown as T[];
};
