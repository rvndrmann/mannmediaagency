import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, Plus, Video } from "lucide-react";

interface VideoCreationBarProps {
  availableStories: number;
  creditsRemaining: number;
  onCreateClick: () => void;
}

export const VideoCreationBar = ({
  availableStories,
  creditsRemaining,
  onCreateClick,
}: VideoCreationBarProps) => {
  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-purple-100">
            <Film className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-purple-900">Create New Video</h3>
            <p className="text-xs text-purple-600">
              {availableStories} stories available ({creditsRemaining} credits)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={onCreateClick}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Video
          </Button>
          <Button
            variant="outline"
            className="hidden sm:flex border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Video className="w-4 h-4 mr-2" />
            Tutorial
          </Button>
        </div>
      </div>
    </Card>
  );
};