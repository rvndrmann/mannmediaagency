
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Sparkles } from "lucide-react";
import { SceneUpdateType } from "@/types/canvas";

interface SceneContentFormProps {
  label: string;
  value: string;
  fieldType: SceneUpdateType;
  placeholder: string;
  isSaving: boolean;
  isGenerating: boolean;
  isProcessing: boolean;
  activeAgent?: string | null;
  onSave: () => Promise<void>;
  onChange: (value: string) => void;
  onGenerateWithAI?: () => Promise<void>;
  minHeight?: string;
  imagePreview?: string;
}

export function SceneContentForm({
  label,
  value,
  fieldType,
  placeholder,
  isSaving,
  isGenerating,
  isProcessing,
  activeAgent,
  onSave,
  onChange,
  onGenerateWithAI,
  minHeight = "150px",
  imagePreview
}: SceneContentFormProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <Label htmlFor={`scene-${fieldType}`}>{label}</Label>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSave} 
            disabled={isSaving || isProcessing}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
          
          {onGenerateWithAI && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onGenerateWithAI}
              disabled={isGenerating || isProcessing}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isProcessing && activeAgent === fieldType ? "Generating..." : "Generate with AI"}
            </Button>
          )}
        </div>
      </div>
      
      <Textarea 
        id={`scene-${fieldType}`} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-[${minHeight}]`}
      />
      
      {imagePreview && fieldType === 'description' && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-2">AI will use this image as reference when generating descriptions:</p>
          <img src={imagePreview} alt="Scene reference" className="max-h-40 rounded-md border" />
        </div>
      )}
    </div>
  );
}
