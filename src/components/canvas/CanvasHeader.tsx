
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CanvasProject } from "@/types/canvas";
import { 
  MessageSquare, 
  History, 
  ArrowRight, 
  Video,
  Edit,
  Check,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface CanvasHeaderProps {
  project: CanvasProject | null;
  onChatToggle: () => void;
  showChatButton: boolean;
  onFullChatOpen: () => void;
  onShowHistory: () => void;
  onUpdateTitle?: (title: string) => Promise<void>;
}

export function CanvasHeader({ 
  project, 
  onChatToggle, 
  showChatButton,
  onFullChatOpen,
  onShowHistory,
  onUpdateTitle
}: CanvasHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const handleEditTitle = () => {
    if (project) {
      setTitleInput(project.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (project && onUpdateTitle && titleInput.trim()) {
      await onUpdateTitle(titleInput.trim());
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
  };

  return (
    <div className="p-4 border-b bg-background">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-primary" />
            
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="h-8 w-64"
                  autoFocus
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSaveTitle}
                  className="h-8 w-8 text-green-600"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCancelEdit}
                  className="h-8 w-8 text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <h1 className="text-xl font-semibold">
                  {project ? project.title : "New Video Project"}
                  {project && <span className="text-sm ml-2 text-muted-foreground">({project.id.substring(0, 8)})</span>}
                </h1>
                {project && onUpdateTitle && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleEditTitle}
                    className="ml-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onShowHistory}>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          
          {showChatButton && (
            <Button variant="outline" onClick={onChatToggle}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Assistant
            </Button>
          )}
          
          <Button onClick={onFullChatOpen}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Full AI Assistant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
