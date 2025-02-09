
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const handleGenerateScript = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");

    if (lastAssistantMessage) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleGenerateScript}>
          <PenTool className="h-4 w-4 mr-2" />
          Use Last AI Response
        </Button>
      </div>
      <Textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Start writing your script here..."
        className="min-h-[200px]"
      />
    </div>
  );
};
