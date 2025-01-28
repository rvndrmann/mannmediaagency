import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

interface StoryTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

type StoryType = Database['public']['Tables']['story type']['Row'];

export const StoryTypeSelect = ({ value, onChange }: StoryTypeSelectProps) => {
  const { data: storyTypes, isLoading } = useQuery({
    queryKey: ['storyTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story type')
        .select('id, story_type');
      
      if (error) throw error;
      return data as StoryType[];
    }
  });

  const displayItems = isLoading || !storyTypes?.length 
    ? Array(3).fill({ id: 0, story_type: 'Loading...' })
    : storyTypes;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base">
        <SelectValue placeholder="Select a story type" />
      </SelectTrigger>
      <SelectContent>
        {displayItems.map((type) => (
          <SelectItem 
            key={type.id} 
            value={type.id.toString()}
            className="py-2 px-4 hover:bg-purple-50"
          >
            {type.story_type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};