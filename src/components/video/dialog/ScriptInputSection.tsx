
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ScriptInputSectionProps {
  source: string;
  onSourceChange: (value: string) => void;
}

export const ScriptInputSection = ({
  source,
  onSourceChange,
}: ScriptInputSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="source" className="text-xl text-purple-600">
        Script or Idea <span className="text-red-500">*</span>
      </Label>
      <Input
        id="source"
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        placeholder="Enter your script or idea"
        className="w-full p-4 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
      />
    </div>
  );
};
