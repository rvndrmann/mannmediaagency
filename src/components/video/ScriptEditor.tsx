
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScriptEditorProps {
  script: string;
  setScript: (script: string) => void;
  messages: Message[];
}

export const ScriptEditor = ({ script, setScript, messages }: ScriptEditorProps) => {
  const { toast } = useToast();
  const MAX_WORDS = 350;

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentWords = countWords(script);
  const progress = (currentWords / MAX_WORDS) * 100;

  const handleGenerateScript = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");

    if (lastAssistantMessage) {
      const words = countWords(lastAssistantMessage.content);
      if (words > MAX_WORDS) {
        toast({
          title: "Word Limit Exceeded",
          description: `The AI response has ${words} words. Maximum allowed is ${MAX_WORDS} words.`,
          variant: "destructive",
        });
        return;
      }
      setScript(lastAssistantMessage.content);
      toast({
        title: "Script Generated",
        description: "The last AI response has been used as your script.",
      });
    } else {
      toast({
        title: "No Script Found",
        description: "No AI responses found to generate script from.",
        variant: "destructive",
      });
    }
  };

  const handleScriptChange = (value: string) => {
    const words = countWords(value);
    if (words <= MAX_WORDS) {
      setScript(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button 
          onClick={handleGenerateScript}
          className="bg-green-500 text-white hover:bg-green-600"
        >
          <PenTool className="h-4 w-4 mr-2" />
          Use Last AI Response
        </Button>
        <span className={`text-sm ${currentWords >= MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
          {currentWords}/{MAX_WORDS} words
        </span>
      </div>
      <Textarea
        value={script}
        onChange={(e) => handleScriptChange(e.target.value)}
        placeholder="Start writing your script here..."
        className="min-h-[300px] focus:outline-none resize-none p-4"
      />
      <Progress value={progress} className="w-full" />
    </div>
  );
};
