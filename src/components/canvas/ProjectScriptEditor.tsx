
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { 
  Save, 
  Scissors,
  AlertCircle,
  Edit,
  Check,
  X
} from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProjectScriptEditorProps {
  project: CanvasProject;
  scenes: CanvasScene[];
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
  updateProjectTitle?: (title: string) => Promise<void>;
}

export function ProjectScriptEditor({ 
  project, 
  scenes, 
  saveFullScript,
  divideScriptToScenes,
  updateProjectTitle
}: ProjectScriptEditorProps) {
  const [script, setScript] = useState(project.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title || "");
  const [extractedTitle, setExtractedTitle] = useState<string | null>(null);
  
  useEffect(() => {
    setScript(project.fullScript || "");
    setTitleInput(project.title || "");
  }, [project]);
  
  const handleSaveScript = async () => {
    try {
      setIsSaving(true);
      await saveFullScript(script);
      
      // Check if there's a title in the script
      extractTitleFromScript(script);
      
      toast.success("Script saved successfully");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script) {
      toast.error("Please write a script first");
      return;
    }
    
    try {
      setIsDividing(true);
      
      // Simple divide algorithm: Split by SCENE headers or blank lines
      const sceneDivisions = script.split(/SCENE \d+|(?:\r?\n){2,}/g)
        .filter(content => content.trim().length > 0);
      
      // If we don't have enough scenes, add more
      while (scenes.length < sceneDivisions.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit to avoid too many requests
        const newSceneId = await addScene();
        if (!newSceneId) break;
      }
      
      // Map scene content to existing scenes
      const sceneScripts = sceneDivisions
        .slice(0, scenes.length)
        .map((content, index) => ({
          id: scenes[index].id,
          content: content.trim()
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
  
  const extractTitleFromScript = (scriptContent: string) => {
    if (!scriptContent || !updateProjectTitle) return;
    
    // Look for common title patterns
    const titlePatterns = [
      /^Title:[\s]*(.+?)[\r\n]/i,            // Title: My Script
      /^#\s*(.+?)[\r\n]/,                    // # My Script
      /TITLE:[\s]*(.+?)[\r\n]/i,             // TITLE: My Script
      /^\s*"(.+?)"[\r\n]/,                   // "My Script"
      /FADE IN:\s*[\r\n]+\s*(.+?)[\r\n]/i,   // FADE IN: followed by title
      /^\s*(.+?)\s*[\r\n]+by[\r\n]/i         // Title followed by "by"
    ];
    
    for (const pattern of titlePatterns) {
      const match = scriptContent.match(pattern);
      if (match && match[1]) {
        const newTitle = match[1].trim();
        if (newTitle && newTitle !== project.title) {
          setExtractedTitle(newTitle);
          return;
        }
      }
    }
    
    setExtractedTitle(null);
  };
  
  const handleSaveTitle = async () => {
    if (updateProjectTitle && titleInput.trim()) {
      try {
        await updateProjectTitle(titleInput.trim());
        setIsEditingTitle(false);
        setExtractedTitle(null);
      } catch (error) {
        console.error("Error updating title:", error);
        toast.error("Failed to update title");
      }
    }
  };
  
  const handleUseExtractedTitle = async () => {
    if (extractedTitle && updateProjectTitle) {
      setTitleInput(extractedTitle);
      try {
        await updateProjectTitle(extractedTitle);
        setExtractedTitle(null);
        toast.success("Project title updated");
      } catch (error) {
        console.error("Error updating title:", error);
        toast.error("Failed to update title");
      }
    }
  };
  
  const addScene = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase.from('canvas_scenes').insert({
        project_id: project.id,
        title: `Scene ${scenes.length + 1}`,
        scene_order: scenes.length
      }).select('id').single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error("Error adding scene:", error);
      return undefined;
    }
  };
  
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold mr-4">Full Script</h2>
          
          {!isEditingTitle ? (
            <div className="flex items-center">
              <span className="text-muted-foreground">Project Title: {project.title}</span>
              {updateProjectTitle && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setTitleInput(project.title);
                    setIsEditingTitle(true);
                  }}
                  className="ml-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
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
                onClick={() => setIsEditingTitle(false)}
                className="h-8 w-8 text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleDivideScript} 
            variant="outline"
            disabled={isSaving || isDividing || !script.trim()}
          >
            {isDividing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Dividing...
              </>
            ) : (
              <>
                <Scissors className="mr-2 h-4 w-4" />
                Divide into Scenes
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSaveScript}
            disabled={isSaving || isDividing}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Script
              </>
            )}
          </Button>
        </div>
      </div>
      
      {extractedTitle && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Title Detected</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>We detected a potential title in your script: <strong>{extractedTitle}</strong></span>
            <Button size="sm" onClick={handleUseExtractedTitle}>Use This Title</Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        className="flex-1 min-h-[400px] font-mono"
        placeholder="Write your script here. To divide into scenes, use blank lines or 'SCENE X' markers between scenes."
      />
    </div>
  );
}
