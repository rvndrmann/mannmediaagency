import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  storyTypes: Array<{ id: number; story_type: string | null; }>;
}

export const StyleSelector = ({ value, onChange, storyTypes }: StyleSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="style" className="text-xl text-purple-600">
        Style
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a style" />
        </SelectTrigger>
        <SelectContent>
          {storyTypes?.map((type) => (
            <SelectItem 
              key={type.id} 
              value={type.story_type || ""}
            >
              {type.story_type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};