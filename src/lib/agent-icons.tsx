
import { Bot, PenLine, Image, Wrench, FileText, User } from 'lucide-react';
import React from 'react';

export function getAgentIcon(agentType: string | undefined, className: string = "w-4 h-4") {
  switch (agentType) {
    case 'main':
      return <Bot className={className} />;
    case 'script':
      return <PenLine className={className} />;
    case 'image':
      return <Image className={className} />;
    case 'tool':
      return <Wrench className={className} />;
    case 'scene':
      return <FileText className={className} />;
    case 'user':
      return <User className={className} />;
    default:
      return <Bot className={className} />;
  }
}
