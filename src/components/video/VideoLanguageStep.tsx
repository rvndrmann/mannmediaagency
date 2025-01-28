import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <div className="space-y-4">
        <Label className="text-2xl font-semibold text-purple-600">
          Select Language <span className="text-red-500">*</span>
        </Label>
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-full bg-white border border-purple-100 rounded-xl p-4">
            <SelectValue placeholder="Select language">
              {selectedLanguage === "en-US" && "English 🇺🇸"}
              {selectedLanguage === "es" && "Spanish 🇪🇸"}
              {selectedLanguage === "fr" && "French 🇫🇷"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-US">English 🇺🇸</SelectItem>
            <SelectItem value="es">Spanish 🇪🇸</SelectItem>
            <SelectItem value="fr">French 🇫🇷</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label className="text-2xl font-semibold text-purple-600">
          Video Length <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={selectedDuration}
          onValueChange={setSelectedDuration}
          className="grid grid-cols-1 gap-3"
        >
          <Label
            htmlFor="60"
            className={`relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              selectedDuration === "60"
                ? "border-purple-200 bg-purple-50/50"
                : "hover:bg-purple-50/30"
            }`}
          >
            <RadioGroupItem value="60" id="60" className="sr-only" />
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-purple-900">
                60 seconds
              </span>
              <span className="text-base text-purple-600">
                Standard (20 credits)
              </span>
            </div>
          </Label>
          <Label
            htmlFor="90"
            className={`relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              selectedDuration === "90"
                ? "border-purple-200 bg-purple-50/50"
                : "hover:bg-purple-50/30"
            }`}
          >
            <RadioGroupItem value="90" id="90" className="sr-only" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-purple-900">
                  90 seconds
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  Premium
                </span>
              </div>
              <span className="text-base text-purple-600">
                Premium (25 credits)
              </span>
            </div>
          </Label>
        </RadioGroup>
      </div>
    </div>
  );
};