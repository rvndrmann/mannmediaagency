
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { WorkRequestsList } from "@/components/work-requests/WorkRequestsList";
import { CreateWorkRequestDialog } from "@/components/work-requests/CreateWorkRequestDialog";
import { useState } from "react";
import { useUserCredits } from "@/hooks/use-user-credits";
import { Card } from "@/components/ui/card";

const WorkRequestsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: credits } = useUserCredits();

  const { data: requests } = useQuery({
    queryKey: ["workRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Work Requests</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Credits</h2>
          <span className="text-2xl font-bold">{credits?.credits_remaining || 0}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Each work request requires credits. Make sure you have enough credits before submitting a request.
        </p>
      </Card>

      <WorkRequestsList requests={requests || []} />
      
      <CreateWorkRequestDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};

export default WorkRequestsPage;
