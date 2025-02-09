
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScriptBuilderTabProps {
  messages: Message[];
}

export const ScriptBuilderTab = ({ messages }: ScriptBuilderTabProps) => {
  const [script, setScript] = useState("");
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerateScript = () => {
    // Get the last assistant message
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

  const handleCreateVideo = () => {
    if (!script.trim()) {
      toast({
        title: "Error",
        description: "Please generate or write a script first",
        variant: "destructive",
      });
      return;
    }
    setIsVideoDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Script Builder</h3>
          <div className="flex gap-2">
            <Button onClick={handleGenerateScript}>
              <PenTool className="h-4 w-4 mr-2" />
              Use Last AI Response
            </Button>
            <Button variant="secondary" onClick={handleCreateVideo}>
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </div>
        </div>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Start writing your script here..."
          className="min-h-[200px]"
        />
      </Card>

      <CreateVideoDialog
        isOpen={isVideoDialogOpen}
        onClose={() => setIsVideoDialogOpen(false)}
        availableVideos={5}
        creditsRemaining={100}
        initialScript={script}
      />
    </div>
  );
};
