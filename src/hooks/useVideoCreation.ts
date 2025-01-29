import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useVideoCreation = (onSuccess: () => void) => {
  const [step, setStep] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedDuration, setSelectedDuration] = useState("60");
  const [selectedVoice, setSelectedVoice] = useState("david");
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [storyType, setStoryType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      console.log("Fetching user credits...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        throw error;
      }

      console.log("User credits data:", data);
      return data;
    },
  });

  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);
  const hasEnoughCredits = userCredits?.credits_remaining >= 20;

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrevious = () => setStep((prev) => prev - 1);

  const handleGenerateScript = () => {
    console.log("Generating script for topic:", topic);
    setScript("Your script will appear here. You can edit it after generation.");
  };

  const handleCreateVideo = async () => {
    try {
      if (!hasEnoughCredits) {
        toast({
          variant: "destructive",
          title: "Insufficient credits",
          description: "You need 20 credits to create a video. Please purchase more credits.",
        });
        return;
      }

      setIsSubmitting(true);
      console.log("Creating video with script:", script);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No user found");
      }

      const { data, error } = await supabase
        .from("stories")
        .insert([{ 
          source: script,
          user_id: user.id,
          story_type_id: storyType ? parseInt(storyType) : null,
          ready_to_go: true
        }])
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
      await refetchCredits();

      toast({
        title: "Success",
        description: "Video created successfully!",
      });
      
      // Reset form
      setStep(1);
      setTopic("");
      setScript("");
      onSuccess();
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

  return {
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
    storyType,
    setStoryType,
    isSubmitting,
    userCredits,
    availableVideos,
    hasEnoughCredits,
    handleNext,
    handlePrevious,
    handleGenerateScript,
    handleCreateVideo,
  };
};