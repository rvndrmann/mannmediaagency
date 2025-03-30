
import { useState, useEffect } from "react";
import { CanvasProject } from "@/types/canvas";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Sparkles, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProjectScriptEditorProps {
  project: CanvasProject;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  updateProjectTitle: (title: string) => Promise<void>;
}

export function ProjectScriptEditor({
  project,
  saveFullScript,
  divideScriptToScenes,
  updateProjectTitle
}: ProjectScriptEditorProps) {
  const [script, setScript] = useState(project.fullScript || "");
  const [title, setTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Update local state when project changes
  useEffect(() => {
    setScript(project.fullScript || "");
    setTitle(project.title);
  }, [project]);
  
  const handleSaveScript = async () => {
    setIsSaving(true);
    try {
      await saveFullScript(script);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script.trim()) {
      toast.error("Please write a script first");
      return;
    }
    
    setIsProcessing(true);
    try {
      // Get the scene IDs
      const sceneIds = project.scenes.map(scene => scene.id);
      
      // Call the process-script function
      const toastId = toast.loading("Processing script...");
      
      const { data, error } = await supabase.functions.invoke('process-script', {
        body: { 
          script, 
          sceneIds,
          projectId: project.id,
          generateImagePrompts: true
        }
      });

      toast.dismiss(toastId);
      
      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Script processing failed");
      }
      
      // Check if we received scene data
      if (!data.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
        throw new Error("No scene data returned from processing");
      }
      
      // Convert scenes data for divideScriptToScenes
      const sceneScripts = data.scenes.map(scene => ({
        id: scene.id,
        content: scene.content || "",
        voiceOverText: scene.voiceOverText || ""
      }));
      
      // Update the scenes with the divided script content
      await divideScriptToScenes(sceneScripts);
      
      toast.success("Script divided into scenes");
      
      // Show message about image prompts
      if (data.imagePrompts) {
        const { processedScenes, successfulScenes } = data.imagePrompts;
        if (processedScenes > 0) {
          toast.success(`Generated image prompts for ${successfulScenes} out of ${processedScenes} scenes`);
        }
      }
    } catch (error) {
      console.error("Error dividing script:", error);
      toast.error(error.message || "Failed to process script");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveTitle = async () => {
    try {
      await updateProjectTitle(title);
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };
  
  // Safely access scenes length with proper null checking
  const scenesCount = project?.scenes?.length || 0;
  
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        {isEditingTitle ? (
          <div className="flex items-center mb-2">
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold h-10 mr-2"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSaveTitle}
            >
              <Check className="h-5 w-5 text-green-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setTitle(project.title);
                setIsEditingTitle(false);
              }}
            >
              <X className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center mb-2">
            <h1 className="text-2xl font-bold mr-2">{title}</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsEditingTitle(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="text-muted-foreground">
          {scenesCount} {scenesCount === 1 ? 'scene' : 'scenes'}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p>Write your full script here, then click "Divide into Scenes" to automatically split it into individual scenes.</p>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="full-script">Full Script</Label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveScript}
                disabled={isSaving}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button 
                size="sm" 
                onClick={handleDivideScript}
                disabled={isProcessing}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing ? "Processing..." : "Divide into Scenes"}
              </Button>
            </div>
          </div>
          
          <Textarea 
            id="full-script" 
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write your full script here..."
            className="min-h-[400px] font-mono"
          />
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>Tips:</p>
        <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
          <li>Write your script with clear scene separations</li>
          <li>Use scene headings like "SCENE 1: Introduction" to help the AI identify scene boundaries</li>
          <li>The AI will automatically generate voice-over text and image prompts for each scene</li>
        </ul>
      </div>
    </div>
  );
}
