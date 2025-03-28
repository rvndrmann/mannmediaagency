
import { useState, useEffect } from "react";
import { CanvasProject } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Wand2, Save, Scissors } from "lucide-react";
import { ScriptInputPanel } from "./ScriptInputPanel";
import { toast } from "sonner";

interface CanvasScriptPanelProps {
  project: CanvasProject;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
}

export function CanvasScriptPanel({ 
  project, 
  onClose, 
  saveFullScript,
  divideScriptToScenes
}: CanvasScriptPanelProps) {
  const [script, setScript] = useState(project.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  
  useEffect(() => {
    setScript(project.fullScript || "");
  }, [project.fullScript]);
  
  const handleSaveScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveFullScript(script);
      toast.success("Script saved successfully");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    setIsDividing(true);
    try {
      const sceneScripts = project.scenes.map(scene => ({
        id: scene.id,
        content: "",
      }));
      await divideScriptToScenes(sceneScripts);
      toast.success("Script divided into scenes");
    } catch (error) {
      console.error("Error dividing script:", error);
      toast.error("Failed to divide script");
    } finally {
      setIsDividing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h3 className="text-sm font-medium">Script Editor</h3>
        </div>
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDivideScript}
            disabled={isDividing || !script.trim()}
          >
            <Scissors className="h-4 w-4 mr-2" />
            {isDividing ? "Dividing..." : "Divide to Scenes"}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleSaveScript}
            disabled={isSaving || !script.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Script"}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Write your script here..."
          className="min-h-[500px] font-mono text-sm"
        />
      </div>
    </div>
  );
}
