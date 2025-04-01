
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Wand2, Loader2 } from "lucide-react";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";

interface CanvasScriptPanelProps {
  project: CanvasProject | null;
  projectId: string;
  onClose: () => void;
  onUpdateScene?: (sceneId: string, type: string, value: string) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}

export function CanvasScriptPanel({
  project,
  projectId,
  onClose,
  onUpdateScene,
  saveFullScript,
  divideScriptToScenes
}: CanvasScriptPanelProps) {
  const [fullScript, setFullScript] = useState(project?.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  
  const handleSave = async () => {
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
  
  const handleDivide = async () => {
    if (!fullScript.trim()) {
      toast.error("Please write a script first");
      return;
    }
    
    setIsDividing(true);
    try {
      // In a real implementation, this would call an AI service to divide the script
      // For this mock, we'll create simple scene divisions
      const lines = fullScript.split('\n');
      const scenesCount = project?.scenes?.length || 0;
      
      if (scenesCount === 0) {
        toast.error("No scenes available to divide script into");
        return;
      }
      
      const chunkSize = Math.max(1, Math.floor(lines.length / scenesCount));
      const sceneScripts = [];
      
      for (let i = 0; i < scenesCount; i++) {
        const startIdx = i * chunkSize;
        const endIdx = i === scenesCount - 1 ? lines.length : (i + 1) * chunkSize;
        const content = lines.slice(startIdx, endIdx).join('\n');
        
        // Create a voiceOver summary as first few words
        const voiceOverText = content.split(' ').slice(0, 20).join(' ') + '...';
        
        sceneScripts.push({
          id: project.scenes[i].id,
          content,
          voiceOverText
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
    <div className="w-96 border-l flex flex-col h-full bg-background">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Script Editor</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between mb-2">
          <h4 className="text-sm font-medium">Full Script</h4>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
            <Button 
              size="sm" 
              onClick={handleDivide}
              disabled={isDividing}
            >
              {isDividing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
              Divide
            </Button>
          </div>
        </div>
        
        <Textarea 
          className="flex-1 min-h-0 font-mono text-sm"
          value={fullScript}
          onChange={(e) => setFullScript(e.target.value)}
          placeholder="Write your full script here. This will be divided into individual scenes."
        />
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Tips:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use clear scene breaks</li>
            <li>Start with INT/EXT locations</li>
            <li>Include camera directions</li>
            <li>Separate dialogue with character names</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
