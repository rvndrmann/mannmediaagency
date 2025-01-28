import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface VideoLanguageStepProps {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  selectedDuration: string;
  setSelectedDuration: (duration: string) => void;
}

export const VideoLanguageStep = ({
  selectedLanguage,
  setSelectedLanguage,
  selectedDuration,
  setSelectedDuration,
}: VideoLanguageStepProps) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <Label className="text-sm font-semibold mb-2 block text-purple-900">
          Select Language <span className="text-red-400">*</span>
        </Label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full p-2.5 border border-purple-100 rounded-lg text-sm bg-white/50 backdrop-blur-sm hover:border-purple-200 transition-colors focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
        >
          <option value="en-US">English 🇺🇸</option>
          <option value="es">Spanish 🇪🇸</option>
          <option value="fr">French 🇫🇷</option>
        </select>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-2 block text-purple-900">
          Video Length <span className="text-red-400">*</span>
        </Label>
        <RadioGroup
          value={selectedDuration}
          onValueChange={setSelectedDuration}
          className="grid grid-cols-1 gap-2"
        >
          <Label
            htmlFor="60"
            className={`relative flex cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
              selectedDuration === "60"
                ? "border-purple-200 bg-purple-50/50 shadow-sm"
                : "hover:bg-purple-50/30"
            }`}
          >
            <RadioGroupItem value="60" id="60" className="sr-only" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-900">
                60 seconds
              </span>
              <span className="text-xs text-purple-600">
                Standard (20 credits)
              </span>
            </div>
          </Label>
          <Label
            htmlFor="90"
            className={`relative flex cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
              selectedDuration === "90"
                ? "border-purple-200 bg-purple-50/50 shadow-sm"
                : "hover:bg-purple-50/30"
            }`}
          >
            <RadioGroupItem value="90" id="90" className="sr-only" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-900">
                  90 seconds
                </span>
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                  Premium
                </span>
              </div>
              <span className="text-xs text-purple-600">
                Premium (25 credits)
              </span>
            </div>
          </Label>
        </RadioGroup>
      </div>
    </div>
  );
};