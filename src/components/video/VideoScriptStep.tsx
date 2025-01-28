import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface VideoScriptStepProps {
  topic: string;
  setTopic: (topic: string) => void;
  script: string;
  setScript: (script: string) => void;
  onGenerateScript: () => void;
  popularTopics: string[];
}

export const VideoScriptStep = ({
  topic,
  setTopic,
  script,
  setScript,
  onGenerateScript,
  popularTopics,
}: VideoScriptStepProps) => {
  const handleTopicClick = (selectedTopic: string) => {
    setTopic(selectedTopic);
  };

  return (
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
          onClick={onGenerateScript}
          className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm text-sm py-2 transition-all duration-200"
        >
          Generate Script
        </Button>
      </div>
    </div>
  );
};