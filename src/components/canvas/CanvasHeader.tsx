
import { useState } from "react";
import { CanvasProject } from "@/types/canvas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Save, ArrowLeft, Check, Edit, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CanvasHeaderProps {
  project: CanvasProject;
  onChatToggle?: () => void;
  showChatButton?: boolean;
}

export function CanvasHeader({ 
  project,
  onChatToggle,
  showChatButton = false
}: CanvasHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTitle, setProjectTitle] = useState(project?.title || "");
  
  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };
  
  const handleTitleSave = async () => {
    if (!project || !projectTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ title: projectTitle })
        .eq('id', project.id);
      
      if (error) throw error;
      
      setIsEditingTitle(false);
      toast.success("Project title updated");
    } catch (error) {
      console.error("Error updating project title:", error);
      toast.error("Failed to update project title");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setProjectTitle(project?.title || "");
    }
  };
  
  if (!project) return null;
  
  return (
    <header className="bg-background p-2 border-b flex items-center justify-between">
      <div className="flex items-center">
        <Button variant="outline" size="sm" asChild className="mr-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        
        {isEditingTitle ? (
          <div className="flex items-center">
            <Input 
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-base w-[300px]"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleTitleSave}
              className="ml-1"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center group cursor-pointer" onClick={handleTitleClick}>
            <h1 className="text-xl font-semibold mr-2">
              {project.title}
            </h1>
            <Edit className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {showChatButton && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onChatToggle}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            AI Assistant
          </Button>
        )}
        
        <Button size="sm">
          <Save className="h-4 w-4 mr-1" />
          Save Project
        </Button>
      </div>
    </header>
  );
}
