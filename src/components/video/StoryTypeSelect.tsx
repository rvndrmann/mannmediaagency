import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StoryTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const StoryTypeSelect = ({ value, onChange }: StoryTypeSelectProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="storyType" className="text-lg text-purple-700">
        Story Type <span className="text-red-500">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border border-purple-100">
          <SelectValue placeholder="Select a story type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Educational</SelectItem>
          <SelectItem value="2">Entertainment</SelectItem>
          <SelectItem value="3">Marketing</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};