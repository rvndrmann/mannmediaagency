
import { User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";

interface UserProfileProps {
  email: string | undefined;
  availableStories: number;
  creditsRemaining: number;
}

export const UserProfile = ({ email, availableStories, creditsRemaining }: UserProfileProps) => {
  const location = useLocation();
  const isCreateVideoPage = location.pathname === "/create-video";

  return (
    <Card className="bg-gray-800 border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">{email}</div>
          <div className="text-xs text-gray-400">Free Plan</div>
        </div>
      </div>
      <div className="text-sm text-gray-400">Available Credits</div>
      <div className="text-2xl font-bold text-white">{creditsRemaining}</div>
      {!isCreateVideoPage && (
        <div className="text-xs text-gray-400 mt-1">
          ({availableStories} stories available)
        </div>
      )}
    </Card>
  );
};
