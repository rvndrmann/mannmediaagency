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
  const { data: storyTypes, isLoading, error } = useQuery({
    queryKey: ['storyTypes'],
    queryFn: async () => {
      console.log("Fetching story types...");
      const { data, error } = await supabase
        .from('story type')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) {
        console.error("Error fetching story types:", error);
        throw error;
      }
      
      console.log("Story types fetched:", data);
      return data as StoryType[];
    }
  });

  if (error) {
    console.error("Error in StoryTypeSelect:", error);
    return (
      <Select disabled>
        <SelectTrigger className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base">
          <SelectValue placeholder="Error loading story types" />
        </SelectTrigger>
      </Select>
    );
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base">
          <SelectValue placeholder="Loading story types..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (!storyTypes?.length) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base">
          <SelectValue placeholder="No story types available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base">
        <SelectValue placeholder="Select a story type" />
      </SelectTrigger>
      <SelectContent>
        {storyTypes.map((type) => (
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