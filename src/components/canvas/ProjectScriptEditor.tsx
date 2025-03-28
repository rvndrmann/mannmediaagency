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
      const firstLines = scriptContent.split('\n').slice(0, 5).join(' ');
      
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
  
  const extractVoiceOverText = (content: string): string => {
    let voiceOverText = content.replace(/\[.*?\]/g, '');
    voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
    
    const lines = voiceOverText.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('SCENE') &&
             !trimmedLine.startsWith('CUT TO:') &&
             !trimmedLine.startsWith('FADE') &&
             !trimmedLine.startsWith('INT.') &&
             !trimmedLine.startsWith('EXT.') &&
             !trimmedLine.startsWith('TRANSITION');
    });
    
    return lines.join('\n').replace(/\s+/g, ' ').trim();
  };
  
  const splitAtSentenceBoundary = (text: string, maxLength: number): string[] => {
    if (text.length <= maxLength) return [text];
    
    let splitPoint = text.substring(0, maxLength).lastIndexOf('.');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('!');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('?');
    
    if (splitPoint === -1 || splitPoint < maxLength * 0.5) {
      splitPoint = text.substring(0, maxLength).lastIndexOf(' ');
    }
    
    if (splitPoint === -1) splitPoint = maxLength;
    
    const firstPart = text.substring(0, splitPoint + 1).trim();
    const restPart = text.substring(splitPoint + 1).trim();
    
    return [firstPart, ...splitAtSentenceBoundary(restPart, maxLength)];
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
      const sceneMarkers = script.match(/SCENE\s+\d+|\bINT\.\s|\bEXT\.\s|\bFADE\s+IN:|\bCUT\s+TO:/g);
      
      let segments: string[] = [];
      
      if (sceneMarkers && sceneMarkers.length >= 2) {
        let text = script;
        let positions: number[] = [];
        
        const regex = /SCENE\s+\d+|\bINT\.\s|\bEXT\.\s|\bFADE\s+IN:|\bCUT\s+TO:/g;
        while ((match = regex.exec(text)) !== null) {
          positions.push(match.index);
        }
        
        for (let i = 0; i < positions.length; i++) {
          const start = positions[i];
          const end = i < positions.length - 1 ? positions[i + 1] : text.length;
          segments.push(text.substring(start, end).trim());
        }
      } else {
        const paragraphs = script.split(/\n\s*\n/)
          .filter(p => p.trim().length > 0);
        
        const CHAR_LIMIT = 1500;
        
        if (paragraphs.length <= scenes.length) {
          paragraphs.forEach(paragraph => {
            if (paragraph.length > CHAR_LIMIT) {
              segments.push(...splitAtSentenceBoundary(paragraph, CHAR_LIMIT));
            } else {
              segments.push(paragraph);
            }
          });
        } else {
          segments = paragraphs;
        }
        
        if (segments.length > scenes.length * 2) {
          const groupedSegments: string[] = [];
          const segmentsPerScene = Math.ceil(segments.length / scenes.length);
          
          for (let i = 0; i < segments.length; i += segmentsPerScene) {
            const group = segments.slice(i, i + segmentsPerScene);
            groupedSegments.push(group.join('\n\n'));
          }
          
          segments = groupedSegments;
        }
      }
      
      while (segments.length < scenes.length) {
        segments.push(segments[segments.length - 1] || "");
      }
      
      if (segments.length > scenes.length) {
        const extraSegments = segments.slice(project.scenes.length - 1);
        segments = segments.slice(0, project.scenes.length - 1);
        segments.push(extraSegments.join('\n\n'));
      }
      
      const sceneScripts = scenes.map((scene, index) => {
        const content = index < segments.length ? segments[index] : "";
        const voiceOverText = extractVoiceOverText(content);
        
        return {
          id: scene.id,
          content,
          voiceOverText
        };
      });
      
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
