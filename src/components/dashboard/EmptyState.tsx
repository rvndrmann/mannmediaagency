
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, DollarSign } from "lucide-react";

interface EmptyStateProps {
  hasEnoughCredits: boolean;
  creditsRemaining: number;
  onCreateOrPurchase: () => void;
}

export const EmptyState = ({ 
  hasEnoughCredits, 
  creditsRemaining, 
  onCreateOrPurchase 
}: EmptyStateProps) => {
  return (
    <Card className="col-span-full p-6 text-center bg-gray-50 w-full max-w-md">
      <div className="flex flex-col items-center gap-4">
        <div className="p-3 rounded-full bg-purple-100">
          {hasEnoughCredits ? (
            <Plus className="w-6 h-6 text-purple-600" />
          ) : (
            <DollarSign className="w-6 h-6 text-purple-600" />
          )}
        </div>
        <div className="space-y-2">
          <div className="text-gray-500">
            {hasEnoughCredits ? (
              "No videos created yet. Create your first video now!"
            ) : (
              <>
                <p>You need at least 10 credits to create a video.</p>
                <p className="text-sm">Current balance: {creditsRemaining} credits</p>
              </>
            )}
          </div>
        </div>
        <Button 
          onClick={onCreateOrPurchase}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {hasEnoughCredits ? (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create First Video
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Purchase Credits
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
