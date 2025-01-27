import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({ open, onOpenChange }: CreateVideoDialogProps) => {
  const [step, setStep] = React.useState(1);
  const [selectedLanguage, setSelectedLanguage] = React.useState("en-US");
  const [selectedDuration, setSelectedDuration] = React.useState("60");
  const [selectedVoice, setSelectedVoice] = React.useState("david");
  const [topic, setTopic] = React.useState("");
  const [script, setScript] = React.useState("");

  const popularTopics = [
    "What If You Could Time Travel to Ancient Egypt?",
    "5 Hidden Gems in Paris",
    "Morning Routine of a CEO",
    "Life in a World Without Smartphones",
    "How to Make the Perfect Avocado Toast",
    "AI Assistant Falls in Love with User"
  ];

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setStep((prev) => prev - 1);
  };

  const handleTopicClick = (selectedTopic: string) => {
    setTopic(selectedTopic);
  };

  const handleGenerateScript = () => {
    // This would typically make an API call to generate the script
    console.log("Generating script for topic:", topic);
    setScript("Your script will appear here. You can edit it after generation.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Your Video</DialogTitle>
        </DialogHeader>

        <div className="mb-8">
          <div className="relative h-2 bg-gray-200 rounded-full mb-2">
            <div
              className="absolute h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            Step {step}: {step === 1 ? "Language" : step === 2 ? "Voice" : "Script"} ({Math.round((step / 3) * 100)}%)
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">
                Select Language <span className="text-red-500">*</span>
              </Label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="en-US">English 🇺🇸</option>
                <option value="es">Spanish 🇪🇸</option>
                <option value="fr">French 🇫🇷</option>
              </select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-4 block">
                Video Length <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={selectedDuration}
                onValueChange={setSelectedDuration}
                className="grid grid-cols-1 gap-4"
              >
                <Label
                  htmlFor="60"
                  className={`relative flex cursor-pointer rounded-lg border p-4 ${
                    selectedDuration === "60"
                      ? "border-purple-200 bg-purple-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value="60" id="60" className="sr-only" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      60 seconds
                    </span>
                    <span className="text-sm text-gray-500">
                      Standard (20 credits)
                    </span>
                  </div>
                </Label>
                <Label
                  htmlFor="90"
                  className={`relative flex cursor-pointer rounded-lg border p-4 ${
                    selectedDuration === "90"
                      ? "border-purple-200 bg-purple-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value="90" id="90" className="sr-only" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        90 seconds
                      </span>
                      <span className="text-xs text-yellow-600 font-medium">
                        Premium
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      Premium (25 credits)
                    </span>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Label className="text-base font-semibold mb-4 block">
              Select Voice <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={selectedVoice}
              onValueChange={setSelectedVoice}
              className="grid grid-cols-1 gap-4"
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
                  className={`relative flex cursor-pointer rounded-lg border p-4 ${
                    selectedVoice === voice.id
                      ? "border-purple-200 bg-purple-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem
                    value={voice.id}
                    id={voice.id}
                    className="sr-only"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {voice.name}
                      </span>
                      {voice.premium && (
                        <span className="text-xs text-yellow-600 font-medium">
                          Premium
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {voice.description}
                    </span>
                  </div>
                  <Info className="ml-auto h-5 w-5 text-gray-400" />
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                Type in Topic <span className="text-red-500">*</span>
              </Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your video topic"
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-base font-semibold mb-2 block">
                Popular Topics
              </Label>
              <div className="flex flex-wrap gap-2">
                {popularTopics.map((popularTopic) => (
                  <Button
                    key={popularTopic}
                    variant="outline"
                    className={`text-sm ${
                      topic === popularTopic ? "border-purple-500 bg-purple-50" : ""
                    }`}
                    onClick={() => handleTopicClick(popularTopic)}
                  >
                    {popularTopic}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base font-semibold">
                  Script <span className="text-red-500">*</span>
                </Label>
                <span className="text-sm text-gray-500">
                  {script.length} / 1500 characters
                </span>
              </div>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Your script will appear here. You can edit it after generation."
                className="min-h-[200px]"
              />
              <Button
                onClick={handleGenerateScript}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
              >
                Generate Script
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button
            onClick={step === 3 ? undefined : handleNext}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {step === 3 ? "Create Video" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
