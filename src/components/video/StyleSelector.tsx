
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

interface StoryType {
  id: number;
  story_type: string | null;
}

interface StyleSelectorProps {
  style: string;
  setStyle: (style: string) => void;
}

export const StyleSelector = ({ style, setStyle }: StyleSelectorProps) => {
  const { data: storyTypes } = useQuery({
    queryKey: ["storyTypes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_type")
        .select("id, story_type");
      
      if (error) {
        throw error;
      }
      
      return data as StoryType[];
    },
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="style" className="text-lg text-purple-700">
        Style
      </Label>
      <Select value={style} onValueChange={setStyle}>
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
