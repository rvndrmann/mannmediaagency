
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const ScriptBuilderTab = () => {
  const [script, setScript] = useState("");
  const { toast } = useToast();

  const handleGenerateScript = async () => {
    toast({
      title: "Coming Soon",
      description: "Script generation will be available soon!",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Script Builder</h3>
          <div className="flex gap-2">
            <Button onClick={handleGenerateScript}>
              <PenTool className="h-4 w-4 mr-2" />
              Generate Script
            </Button>
            <Button variant="secondary">
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
    </div>
  );
};
