import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { useNavigate } from "react-router-dom";

const CreateVideo = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Create New Video</h1>
        </div>
        
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="p-3 rounded-full bg-purple-100 inline-block">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">Start Creating</h2>
            <p className="text-gray-500">
              You have {availableVideos} videos available ({userCredits?.credits_remaining || 0} credits)
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Video
            </Button>
          </div>
        </Card>

        <CreateVideoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          availableVideos={availableVideos}
          creditsRemaining={userCredits?.credits_remaining || 0}
        />
      </div>
    </div>
  );
};

export default CreateVideo;
