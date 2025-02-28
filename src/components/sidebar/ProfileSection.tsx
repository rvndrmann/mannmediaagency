
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ProfileSection = () => {
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

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 20);

  return (
    <Card className="bg-gray-800 border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center">
          <User className="h-5 w-5 text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium text-white truncate">
                  {user?.email}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user?.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-xs text-gray-400">Free Plan</div>
        </div>
      </div>
      <div className="text-sm text-gray-400">Available Videos</div>
      <div className="text-2xl font-bold text-white">{availableStories}</div>
      <div className="text-xs text-gray-400 mt-1">
        ({userCredits?.credits_remaining || 0} credits)
      </div>
    </Card>
  );
};
