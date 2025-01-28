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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

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
    console.log("Generating script for topic:", topic);
    setScript("Your script will appear here. You can edit it after generation.");
  };

  const handleCreateVideo = async () => {
    try {
      setIsSubmitting(true);
      console.log("Creating video with script:", script);
      
      const { data, error } = await supabase
        .from('stories')
        .insert([
          { source: script }
        ])
        .select();

      if (error) {
        console.error("Error creating video:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create video. Please try again.",
        });
        return;
      }

      console.log("Video created successfully:", data);
      toast({
        title: "Success",
        description: "Video created successfully!",
      });
      onOpenChange(false); // Close dialog
      
      // Reset form
      setStep(1);
      setTopic("");
      setScript("");
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

        {step === 1 && (
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
        )}

        {step === 2 && (
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
                  <RadioGroupItem
                    value={voice.id}
                    id={voice.id}
                    className="sr-only"
                  />
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
                    <span className="text-xs text-purple-600">
                      {voice.description}
                    </span>
                  </div>
                  <Info className="ml-auto h-4 w-4 text-purple-400 hover:text-purple-600 transition-colors" />
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <Label className="text-sm font-semibold mb-2 block text-purple-900">
                Type in Topic <span className="text-red-400">*</span>
              </Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your video topic"
                className="w-full text-sm bg-white/50 border-purple-100 focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block text-purple-900">
                Popular Topics
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {popularTopics.map((popularTopic) => (
                  <Button
                    key={popularTopic}
                    variant="outline"
                    size="sm"
                    className={`text-xs transition-all duration-200 ${
                      topic === popularTopic
                        ? "border-purple-300 bg-purple-50 text-purple-700"
                        : "border-purple-100 hover:border-purple-200 hover:bg-purple-50/50"
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
                <Label className="text-sm font-semibold text-purple-900">
                  Script <span className="text-red-400">*</span>
                </Label>
                <span className="text-xs text-purple-600">
                  {script.length} / 1500 characters
                </span>
              </div>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Your script will appear here. You can edit it after generation."
                className="min-h-[120px] text-sm bg-white/50 border-purple-100 focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
              />
              <Button
                onClick={handleGenerateScript}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm text-sm py-2 transition-all duration-200"
              >
                Generate Script
              </Button>
            </div>
          </div>
        )}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 backdrop-blur-xl border border-purple-100 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-900">
            Create Your Video
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="relative h-1.5 bg-purple-100 rounded-full mb-2">
            <div
              className="absolute h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <p className="text-xs text-purple-700 font-medium">
            Step {step}: {step === 1 ? "Language" : step === 2 ? "Voice" : "Script"} ({Math.round((step / 3) * 100)}%)
          </p>
        </div>

        <div className="flex justify-between mt-4 pt-2 border-t border-purple-100">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1 || isSubmitting}
            size="sm"
            className="text-purple-700 border-purple-200 hover:bg-purple-50"
          >
            Previous
          </Button>
          <Button
            onClick={step === 3 ? handleCreateVideo : handleNext}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
            size="sm"
          >
            {isSubmitting ? "Creating..." : step === 3 ? "Create Video" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
