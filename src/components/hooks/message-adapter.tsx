
import React from 'react';
import { Message } from '@/types/message';

/**
 * This utility helps adapt messages between different component types
 * when the global Message type and component-specific Message types 
 * have incompatible role definitions.
 */

// Simple message adapter for components that expect only 'user' and 'assistant' roles
export const adaptMessagesForComponents = (messages: Message[]) => {
  // Filter out messages with incompatible roles for certain components
  return messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );
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
