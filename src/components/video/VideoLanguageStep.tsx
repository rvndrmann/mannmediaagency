import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";

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
    <div className="space-y-6 animate-fadeIn">
      <div>
        <Label className="text-lg font-semibold text-purple-900 mb-2 block">
          Select Language <span className="text-red-500">*</span>
        </Label>
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-full border border-purple-100">
            <SelectValue placeholder="Select a language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-US">English 🇺🇸</SelectItem>
            <SelectItem value="es">Spanish 🇪🇸</SelectItem>
            <SelectItem value="fr">French 🇫🇷</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-lg font-semibold text-purple-900 mb-2 block">
          Video Length <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={selectedDuration}
          onValueChange={setSelectedDuration}
          className="grid grid-cols-1 gap-3"
        >
          <label
            className={`relative flex cursor-pointer rounded-lg border p-4 hover:bg-purple-50/30 transition-all ${
              selectedDuration === "60"
                ? "border-purple-200 bg-purple-50/50 shadow-sm"
                : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              value="60"
              checked={selectedDuration === "60"}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="sr-only"
            />
            <div className="flex flex-col">
              <span className="text-lg font-medium text-purple-900">
                60 seconds
              </span>
              <span className="text-sm text-purple-600">
                Standard (20 credits)
              </span>
            </div>
          </label>

          <label
            className={`relative flex cursor-pointer rounded-lg border p-4 hover:bg-purple-50/30 transition-all ${
              selectedDuration === "90"
                ? "border-purple-200 bg-purple-50/50 shadow-sm"
                : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              value="90"
              checked={selectedDuration === "90"}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="sr-only"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-purple-900">
                  90 seconds
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  Premium
                </span>
              </div>
              <span className="text-sm text-purple-600">
                Premium (25 credits)
              </span>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  );
};