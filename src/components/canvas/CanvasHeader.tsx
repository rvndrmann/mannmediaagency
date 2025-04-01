
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Menu, MessageSquare } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export interface CanvasHeaderProps {
  title?: string;
  onUpdateTitle?: (title: string) => Promise<any>;
  onToggleDetailPanel?: () => void;
  onToggleChatPanel?: () => void;
  onToggleScriptPanel?: () => void;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  showChatButton?: boolean;
}

export const CanvasHeader = ({
  title = 'Untitled Project',
  onUpdateTitle,
  onToggleDetailPanel,
  onToggleChatPanel,
  onToggleScriptPanel,
  showBackButton = true,
  showMenuButton = true,
  showChatButton = true
}: CanvasHeaderProps) => {
  const navigate = useNavigate();
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpdateTitle) {
      onUpdateTitle(e.target.value);
    }
  };
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="h-[60px] flex items-center px-3 border-b bg-background">
      <div className="flex-1 flex items-center space-x-3">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleGoBack}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-[300px]"
          placeholder="Untitled Project"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        {showChatButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleChatPanel}
            className="px-3 h-9"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
        )}
        
        {showMenuButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleDetailPanel}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
