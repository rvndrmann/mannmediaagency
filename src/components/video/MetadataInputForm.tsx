
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { VideoMetadata } from "./types";

interface MetadataInputFormProps {
  metadata: VideoMetadata | null;
  onGenerate: (context: string, titleTwist: string) => void;
  isGenerating: boolean;
  canRegenerate: boolean;
  remainingRegenerations: number;
}

export const MetadataInputForm = ({
  metadata,
  onGenerate,
  isGenerating,
  canRegenerate,
  remainingRegenerations,
}: MetadataInputFormProps) => {
  const [additionalContext, setAdditionalContext] = useState("");
  const [customTitleTwist, setCustomTitleTwist] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/90">
          Additional Context
        </label>
        <Textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Add any additional context for metadata generation..."
          className="bg-[#333333] border-white/10 text-white placeholder:text-white/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/90">
          Custom Title Twist
        </label>
        <Input
          value={customTitleTwist}
          onChange={(e) => setCustomTitleTwist(e.target.value)}
          placeholder="Add your custom twist for the title..."
          className="bg-[#333333] border-white/10 text-white placeholder:text-white/50"
        />
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => onGenerate(additionalContext, customTitleTwist)}
          disabled={isGenerating || !canRegenerate}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {metadata ? "Regenerate" : "Generate"} Metadata
          <span className="ml-2 text-sm opacity-90">
            ({remainingRegenerations} regenerations left)
          </span>
        </Button>
        {!canRegenerate && (
          <p className="text-sm text-red-400 text-center mt-2">
            You have reached the maximum number of regenerations for this metadata.
          </p>
        )}
      </div>
    </div>
  );
};
