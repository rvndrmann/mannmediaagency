
import { useState, useEffect } from "react";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Wand2, 
  Save, 
  SplitSquareVertical, 
  Edit,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectScriptEditorProps {
  project: CanvasProject;
  scenes: CanvasScene[];
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
  updateProjectTitle: (title: string) => Promise<void>;
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
  const [projectTitle, setProjectTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  
  // Sync script when project changes
  useEffect(() => {
    setScript(project.fullScript || "");
    setProjectTitle(project.title);
  }, [project]);
  
  const handleSaveScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveFullScript(script);
      toast.success("Script saved successfully");
      
      // Extract title suggestion if it's a new script or significantly different
      if (!project.fullScript || project.fullScript.length < script.length * 0.5) {
        suggestTitleFromScript(script);
      }
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const suggestTitleFromScript = async (scriptContent: string) => {
    if (!scriptContent || scriptContent.length < 20) return;
    
    try {
      // Get first few lines to extract potential title
      const firstLines = scriptContent.split('\n').slice(0, 5).join(' ');
      
      // Check if there's a title pattern like "Title: XYZ" or "# XYZ"
      const titleMatch = firstLines.match(/(?:title:|#)\s*([^\n]+)/i);
      
      if (titleMatch && titleMatch[1]) {
        const extracted = titleMatch[1].trim();
        if (extracted && extracted !== project.title) {
          setSuggestedTitle(extracted);
        }
      }
    } catch (err) {
      console.error("Error suggesting title:", err);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    if (scenes.length === 0) {
      toast.error("No scenes to divide script into");
      return;
    }
    
    setIsDividing(true);
    try {
      // Simple division by paragraphs
      const paragraphs = script.split(/\n\s*\n/)
        .filter(p => p.trim().length > 0);
      
      // If there are fewer paragraphs than scenes, duplicate the last one
      const finalParagraphs = [...paragraphs];
      while (finalParagraphs.length < scenes.length) {
        finalParagraphs.push(paragraphs[paragraphs.length - 1] || "");
      }
      
      // If there are more paragraphs than scenes, combine extras into the last scene
      const sceneScripts: Array<{ id: string; content: string }> = [];
      
      if (finalParagraphs.length <= scenes.length) {
        // One paragraph per scene
        scenes.forEach((scene, index) => {
          sceneScripts.push({
            id: scene.id,
            content: index < finalParagraphs.length ? finalParagraphs[index] : ""
          });
        });
      } else {
        // Distribute paragraphs evenly
        const paragraphsPerScene = Math.floor(finalParagraphs.length / scenes.length);
        let remainingParagraphs = finalParagraphs.length % scenes.length;
        
        let currentParagraphIndex = 0;
        
        scenes.forEach((scene, sceneIndex) => {
          let paragraphsForThisScene = paragraphsPerScene;
          
          // Distribute remaining paragraphs
          if (remainingParagraphs > 0) {
            paragraphsForThisScene++;
            remainingParagraphs--;
          }
          
          const sceneContent = finalParagraphs
            .slice(currentParagraphIndex, currentParagraphIndex + paragraphsForThisScene)
            .join("\n\n");
          
          sceneScripts.push({
            id: scene.id,
            content: sceneContent
          });
          
          currentParagraphIndex += paragraphsForThisScene;
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
  
  const handleUpdateTitle = async () => {
    if (!projectTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    
    try {
      await updateProjectTitle(projectTitle);
      setIsEditingTitle(false);
      toast.success("Project title updated");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };
  
  const handleApplySuggestedTitle = async () => {
    if (suggestedTitle) {
      setProjectTitle(suggestedTitle);
      try {
        await updateProjectTitle(suggestedTitle);
        toast.success("Project title updated based on script");
        setSuggestedTitle("");
      } catch (error) {
        console.error("Error updating title:", error);
        toast.error("Failed to update title");
      }
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-64"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleUpdateTitle}
              className="text-green-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setProjectTitle(project.title);
                setIsEditingTitle(false);
              }}
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold mr-2">
              {project.title}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditingTitle(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSaveScript}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Script"}
          </Button>
          <Button 
            variant="default" 
            onClick={handleDivideScript}
            disabled={isDividing || !script.trim()}
          >
            <SplitSquareVertical className="h-4 w-4 mr-2" />
            {isDividing ? "Dividing..." : "Divide into Scenes"}
          </Button>
        </div>
      </div>
      
      {suggestedTitle && (
        <div className="bg-muted p-3 rounded-md mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Suggested title based on script: </span>
            <span className="font-semibold">{suggestedTitle}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSuggestedTitle("")}>
              Ignore
            </Button>
            <Button size="sm" onClick={handleApplySuggestedTitle}>
              Use This Title
            </Button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <Label htmlFor="full-script">Full Script</Label>
        <Textarea 
          id="full-script" 
          value={script} 
          onChange={(e) => setScript(e.target.value)}
          placeholder="Write your complete video script here..."
          className="min-h-[60vh]"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <div>
            Character count: {script.length}
          </div>
          <div>
            Scene count: {scenes.length}
          </div>
        </div>
      </div>
    </div>
  );
}
