import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StoryTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

interface StoryType {
  id: number;
  story_type: string | null;
}

export const StoryTypeSelect = ({ value, onChange }: StoryTypeSelectProps) => {
  const { data: storyTypes, isLoading } = useQuery({
    queryKey: ['storyTypes'],
    queryFn: async () => {
      console.log('Fetching story types...');
      const { data, error } = await supabase
        .from('"stories type"')
        .select('id, story_type');
      
      if (error) {
        console.error('Error fetching story types:', error);
        throw error;
      }
      
      console.log('Fetched story types:', data);
      return data as StoryType[];
    }
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="storyType" className="text-lg text-purple-700">
        Story Type <span className="text-red-500">*</span>
      </Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full border border-purple-100">
          <SelectValue placeholder="Select a story type" />
        </SelectTrigger>
        <SelectContent>
          {storyTypes?.map((type) => (
            <SelectItem 
              key={type.id} 
              value={type.id.toString()}
            >
              {type.story_type || `Story Type ${type.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};