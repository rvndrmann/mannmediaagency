
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface ScriptInputPanelProps {
  projectId: string;
  scenes: Array<{ id: string; title: string }>;
  onScriptDivide: (scenes: Array<{ id: string; content: string }>) => Promise<void>;
}

export function ScriptInputPanel({ projectId, scenes, onScriptDivide }: ScriptInputPanelProps) {
  const [fullScript, setFullScript] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Count words in the script
    const words = fullScript.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [fullScript]);

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFullScript(e.target.value);
  };

  const divideScript = () => {
    if (!fullScript.trim()) {
      toast.error("Please enter a script to divide");
      return;
    }

    if (scenes.length === 0) {
      toast.error("No scenes available to divide script into");
      return;
    }

    setIsProcessing(true);

    try {
      // Split the script into words
      const words = fullScript.trim().split(/\s+/).filter(Boolean);
      
      // Calculate how many words per scene (maximum 70)
      const maxWordsPerScene = 70;
      const sceneScripts: Array<{ id: string; content: string }> = [];
      
      let currentWordIndex = 0;
      
      // Distribute words to scenes
      scenes.forEach((scene) => {
        if (currentWordIndex >= words.length) {
          // No more words to distribute
          sceneScripts.push({ id: scene.id, content: "" });
        } else {
          // Calculate how many words to assign to this scene
          const wordsLeft = words.length - currentWordIndex;
          const wordsForThisScene = Math.min(wordsLeft, maxWordsPerScene);
          
          // Get the words for this scene and join them
          const sceneContent = words
            .slice(currentWordIndex, currentWordIndex + wordsForThisScene)
            .join(" ");
          
          sceneScripts.push({ id: scene.id, content: sceneContent });
          
          // Move the index forward
          currentWordIndex += wordsForThisScene;
        }
      });

      // Update scenes with their new scripts
      onScriptDivide(sceneScripts)
        .then(() => {
          toast.success("Script divided across scenes successfully");
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error("Error dividing script:", error);
          toast.error("Failed to divide script");
          setIsProcessing(false);
        });
    } catch (error) {
      console.error("Error processing script:", error);
      toast.error("Error processing script");
      setIsProcessing(false);
    }
  };

  const handleGenerateWithAI = () => {
    toast.info("AI script generation is not implemented yet");
  };

  return (
    <div className="bg-white dark:bg-slate-950 border-b">
      <div 
        className="px-4 py-2 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">Full Script</h3>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {wordCount} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t">
          <Textarea
            ref={textareaRef}
            value={fullScript}
            onChange={handleScriptChange}
            placeholder="Write your full script here. It will be automatically divided into scenes (max 70 words per scene)."
            className="min-h-[120px] mb-4"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                onClick={divideScript}
                disabled={isProcessing || !fullScript.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Divide into Scenes
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGenerateWithAI}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Script will be divided into scenes with max 70 words each
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
