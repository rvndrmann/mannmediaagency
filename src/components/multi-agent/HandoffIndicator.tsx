
import React from 'react';
import { MessageCircle, User, FileText, ImageIcon, Wrench, Layout, Database, FlaskConical } from 'lucide-react';
import { AgentType } from '@/hooks/multi-agent/runner/types';

interface HandoffIndicatorProps {
  sourceAgent: AgentType;
  targetAgent: AgentType;
  reason?: string;
}

export function HandoffIndicator({ sourceAgent, targetAgent, reason }: HandoffIndicatorProps) {
  const agentLabels: Record<AgentType, string> = {
    'main': 'Main Agent',
    'assistant': 'Assistant',
    'script': 'Script Writer',
    'image': 'Image Generator',
    'tool': 'Tool Agent',
    'scene': 'Scene Creator',
    'scene-generator': 'Scene Generator',
    'data': 'Data Agent'
  };

  const agentIcons: Record<AgentType, React.ReactNode> = {
    'main': <MessageCircle className="h-5 w-5 text-blue-500" />,
    'assistant': <User className="h-5 w-5 text-purple-500" />,
    'script': <FileText className="h-5 w-5 text-green-500" />,
    'image': <ImageIcon className="h-5 w-5 text-pink-500" />,
    'tool': <Wrench className="h-5 w-5 text-orange-500" />, // Changed from Tools to Wrench
    'scene': <Layout className="h-5 w-5 text-indigo-500" />,
    'scene-generator': <FlaskConical className="h-5 w-5 text-teal-500" />,
    'data': <Database className="h-5 w-5 text-gray-500" />
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3 mb-2 rounded-md bg-muted/50 text-sm">
      <div className="flex items-center gap-1">
        {agentIcons[sourceAgent]}
        <span className="font-medium">{agentLabels[sourceAgent]}</span>
      </div>
      <div className="mx-1">→</div>
      <div className="flex items-center gap-1">
        {agentIcons[targetAgent]}
        <span className="font-medium">{agentLabels[targetAgent]}</span>
      </div>
      {reason && (
        <div className="ml-auto text-muted-foreground text-xs">
          Reason: {reason}
        </div>
      )}
    </div>
  );
}
