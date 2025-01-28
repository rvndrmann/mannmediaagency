import { VideoLanguageStep } from "@/components/video/VideoLanguageStep";
import { VideoVoiceStep } from "@/components/video/VideoVoiceStep";
import { VideoScriptStep } from "@/components/video/VideoScriptStep";
import { ProgressBar } from "@/components/video/ProgressBar";
import { Button } from "@/components/ui/button";
import { useVideoCreation } from "@/hooks/useVideoCreation";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const CreateVideo = () => {
  const navigate = useNavigate();
  const {
    step,
    selectedLanguage,
    setSelectedLanguage,
    selectedDuration,
    setSelectedDuration,
    selectedVoice,
    setSelectedVoice,
    topic,
    setTopic,
    script,
    setScript,
    isSubmitting,
    userCredits,
    availableVideos,
    hasEnoughCredits,
    handleNext,
    handlePrevious,
    handleGenerateScript,
    handleCreateVideo,
  } = useVideoCreation(() => navigate("/"));

  const popularTopics = [
    "What If You Could Time Travel to Ancient Egypt?",
    "5 Hidden Gems in Paris",
    "Morning Routine of a CEO",
    "Life in a World Without Smartphones",
    "How to Make the Perfect Avocado Toast",
    "AI Assistant Falls in Love with User",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-900">
              Create Your Video
            </h1>
            <div className="text-sm text-purple-600">
              {availableVideos} videos available ({userCredits?.credits_remaining || 0} credits)
            </div>
          </div>

          <ProgressBar step={step} totalSteps={3} />

          {step === 1 && (
            <VideoLanguageStep
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
            />
          )}

          {step === 2 && (
            <VideoVoiceStep
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
            />
          )}

          {step === 3 && (
            <VideoScriptStep
              topic={topic}
              setTopic={setTopic}
              script={script}
              setScript={setScript}
              onGenerateScript={handleGenerateScript}
              popularTopics={popularTopics}
            />
          )}

          <div className="flex justify-between pt-4 border-t border-purple-100">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1 || isSubmitting}
              className="text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              Previous
            </Button>
            <Button
              onClick={step === 3 ? handleCreateVideo : handleNext}
              disabled={isSubmitting || (step === 3 && !hasEnoughCredits)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {isSubmitting
                ? "Creating..."
                : step === 3
                ? `Create Video (${availableVideos} videos left)`
                : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVideo;