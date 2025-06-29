
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface ScriptInputSectionProps {
  source: string;
  onSourceChange: (value: string) => void;
}

export const ScriptInputSection = ({
  source,
  onSourceChange,
}: ScriptInputSectionProps) => {
  const MAX_WORDS = 350;
  
  const countWords = (text: string | undefined) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentWords = countWords(source);
  const progress = (currentWords / MAX_WORDS) * 100;

  const handleChange = (value: string) => {
    const words = countWords(value);
    if (words <= MAX_WORDS) {
      onSourceChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="source" className="text-xl text-primary">
        Script or Idea <span className="text-destructive">*</span>
      </Label>
      <Textarea
        id="source"
        value={source || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter your script or idea"
        className="w-full min-h-[200px] p-4 border-border rounded-lg focus:ring-primary focus:border-primary resize-none"
      />
      <div className="flex items-center justify-between text-sm">
        <span className={`${currentWords >= MAX_WORDS ? 'text-destructive' : 'text-muted-foreground'}`}>
          {currentWords}/{MAX_WORDS} words
        </span>
        <Progress value={progress} className="w-1/2" />
      </div>
    </div>
  );
};
