import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const [source, setSource] = React.useState("");
  const [selectedLanguage, setSelectedLanguage] = React.useState("en-US");
  const [selectedDuration, setSelectedDuration] = React.useState("60");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleCreateVideo = async () => {
    if (!source || !selectedLanguage || !selectedDuration) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to create a video",
        });
        return;
      }

      const { data, error } = await supabase
        .from("stories")
        .insert({
          source,
          user_id: session.session.user.id,
          ready_to_go: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video creation started! We'll notify you when it's ready.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create video. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-purple-600">Create Your Video</h1>
          <div className="text-sm text-purple-600">0 videos available (5 credits)</div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="source" className="text-lg text-purple-700">
              Script or Idea <span className="text-red-500">*</span>
            </Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter your script or idea"
              className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="text-lg text-purple-700">
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

          <div className="space-y-2">
            <Label className="text-lg text-purple-700">
              Video Length <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              <label className="block p-4 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors">
                <input
                  type="radio"
                  name="duration"
                  value="60"
                  checked={selectedDuration === "60"}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="hidden"
                />
                <div className="flex flex-col">
                  <span className="font-medium">60 seconds</span>
                  <span className="text-sm text-purple-600">Standard (20 credits)</span>
                </div>
              </label>
              <label className="block p-4 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors">
                <input
                  type="radio"
                  name="duration"
                  value="90"
                  checked={selectedDuration === "90"}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="hidden"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">90 seconds</span>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Premium</span>
                  </div>
                  <span className="text-sm text-purple-600">Premium (25 credits)</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-purple-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            Previous
          </Button>
          <Button
            onClick={handleCreateVideo}
            disabled={isSubmitting || !source || !selectedLanguage || !selectedDuration}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {isSubmitting ? "Creating..." : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};