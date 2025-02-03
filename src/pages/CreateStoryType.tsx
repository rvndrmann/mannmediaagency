import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CreateStoryType = () => {
  const [storyType, setStoryType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storyType.trim()) {
      toast({
        title: "Error",
        description: "Please enter a story type",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("story type")
        .insert([{ story_type: storyType.trim() }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Story type created successfully",
      });
      navigate("/");
    } catch (error) {
      console.error("Error creating story type:", error);
      toast({
        title: "Error",
        description: "Failed to create story type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-600">Create Story Type</h1>
        <p className="text-muted-foreground mt-2">
          Add a new story type to use in your videos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="storyType" className="text-lg text-purple-600">
            Story Type <span className="text-red-500">*</span>
          </Label>
          <Input
            id="storyType"
            value={storyType}
            onChange={(e) => setStoryType(e.target.value)}
            placeholder="Enter story type"
            className="w-full p-4 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/")}
            disabled={isSubmitting}
            className="px-8 border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting ? "Creating..." : "Create Story Type"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateStoryType;