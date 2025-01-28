import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ReadyToGoToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const ReadyToGoToggle = ({ checked, onCheckedChange }: ReadyToGoToggleProps) => {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="readyToGo" className="text-lg text-purple-700">
        Ready to Go
      </Label>
      <Switch
        id="readyToGo"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};