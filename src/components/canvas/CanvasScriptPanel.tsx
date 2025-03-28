
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Magic } from "lucide-react";
import { CanvasProject } from "@/types/canvas";
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
  const [fullScript, setFullScript] = useState(project.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  
  const handleSaveScript = async () => {
    setIsSaving(true);
    try {
      await saveFullScript(fullScript);
      toast.success("Script saved successfully");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!fullScript.trim()) {
      toast.error("Please enter a script first");
      return;
    }
    
    if (project.scenes.length <= 0) {
      toast.error("Please add at least one scene first");
      return;
    }
    
    setIsDividing(true);
    try {
      // Simple division logic - divide script evenly among scenes
      const scenes = project.scenes;
      const paragraphs = fullScript.split("\n\n").filter(p => p.trim());
      
      // If fewer paragraphs than scenes, duplicate the last one
      const adjustedParagraphs = [...paragraphs];
      while (adjustedParagraphs.length < scenes.length) {
        adjustedParagraphs.push(paragraphs[paragraphs.length - 1] || "");
      }
      
      // If more paragraphs than scenes, combine extras into the last scene
      const sceneScripts: Array<{ id: string; content: string }> = [];
      if (paragraphs.length <= scenes.length) {
        // One paragraph per scene
        for (let i = 0; i < scenes.length; i++) {
          sceneScripts.push({
            id: scenes[i].id,
            content: adjustedParagraphs[i] || ""
          });
        }
      } else {
        // Distribute paragraphs evenly, with extras going to the last scene
        const paragraphsPerScene = Math.floor(paragraphs.length / scenes.length);
        for (let i = 0; i < scenes.length - 1; i++) {
          const startIdx = i * paragraphsPerScene;
          const content = paragraphs.slice(startIdx, startIdx + paragraphsPerScene).join("\n\n");
          sceneScripts.push({
            id: scenes[i].id,
            content
          });
        }
        
        // Last scene gets all remaining paragraphs
        const startIdx = (scenes.length - 1) * paragraphsPerScene;
        const content = paragraphs.slice(startIdx).join("\n\n");
        sceneScripts.push({
          id: scenes[scenes.length - 1].id,
          content
        });
      }
      
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
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-medium">Full Script</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDivideScript}
            disabled={isDividing || !fullScript}
          >
            <Magic className="h-4 w-4 mr-1" />
            {isDividing ? "Dividing..." : "Divide to Scenes"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveScript}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <Textarea
          value={fullScript}
          onChange={(e) => setFullScript(e.target.value)}
          placeholder="Enter your full script here. You can divide it into scenes using the 'Divide to Scenes' button."
          className="h-full min-h-[300px]"
        />
      </div>
    </div>
  );
}
