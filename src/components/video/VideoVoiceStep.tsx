import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info } from "lucide-react";

interface VideoVoiceStepProps {
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
}

export const VideoVoiceStep = ({
  selectedVoice,
  setSelectedVoice,
}: VideoVoiceStepProps) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <Label className="text-sm font-semibold mb-2 block text-purple-900">
        Select Voice <span className="text-red-400">*</span>
      </Label>
      <RadioGroup
        value={selectedVoice}
        onValueChange={setSelectedVoice}
        className="grid grid-cols-1 gap-2"
      >
        {[
          {
            id: "david",
            name: "David",
            description: "Male US English neural voice",
          },
          {
            id: "james",
            name: "James",
            description: "Male US English neural voice",
          },
          {
            id: "lowy",
            name: "Lowy",
            description: "Soothing, gentle, and warm voice",
            premium: true,
          },
          {
            id: "samantha",
            name: "Samantha",
            description: "Narrations",
            premium: true,
          },
        ].map((voice) => (
          <Label
            key={voice.id}
            htmlFor={voice.id}
            className={`relative flex cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
              selectedVoice === voice.id
                ? "border-purple-200 bg-purple-50/50 shadow-sm"
                : "hover:bg-purple-50/30"
            }`}
          >
            <RadioGroupItem value={voice.id} id={voice.id} className="sr-only" />
            <div className="flex flex-col flex-grow">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-900">
                  {voice.name}
                </span>
                {voice.premium && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                    Premium
                  </span>
                )}
              </div>
              <span className="text-xs text-purple-600">{voice.description}</span>
            </div>
            <Info className="ml-auto h-4 w-4 text-purple-400 hover:text-purple-600 transition-colors" />
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
};