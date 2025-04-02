
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Menu, MessageSquare, PlusCircle } from "lucide-react"; // Added PlusCircle
import { useNavigate } from 'react-router-dom';

export interface CanvasHeaderProps {
  title?: string;
  onUpdateTitle?: (title: string) => Promise<any>;
  onToggleDetailPanel?: () => void;
  // Removed onToggleChatPanel
  onToggleScriptPanel?: () => void;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  // Removed showChatButton
  onNavigateToChat: () => void; // Add new prop
  onCreateNewProject?: () => Promise<string>; // Add prop type
}

export const CanvasHeader = ({
  title = 'Untitled Project',
  onUpdateTitle,
  onToggleDetailPanel,
  // Removed onToggleChatPanel from destructuring
  onToggleScriptPanel,
  showBackButton = true,
  showMenuButton = true,
  // Removed showChatButton from destructuring
  onNavigateToChat, // Destructure new prop
  onCreateNewProject // Destructure prop
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
        {/* Add New Project Button */}
        {onCreateNewProject && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNewProject}
            className="px-3 h-9"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
        {/* Changed AI Assistant button to navigate to Multi-Agent Chat */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToChat} // Use the new navigation handler
          className="px-3 h-9"
        >
          <MessageSquare className="h-4 w-4 mr-2" /> {/* Keep icon or change if desired */}
          Multi-Agent Chat
        </Button>
        
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
