
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StyleSelectorSectionProps {
  style: string;
  onStyleChange: (value: string) => void;
}

export const StyleSelectorSection = ({
  style,
  onStyleChange,
}: StyleSelectorSectionProps) => {
  const { data: storyTypes } = useQuery({
    queryKey: ["storyTypes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_type")
        .select("id, story_type");
      
      if (error) {
        throw error;
      }
      
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="style" className="text-xl text-purple-600">
        Style
      </Label>
      <Select value={style} onValueChange={onStyleChange}>
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
