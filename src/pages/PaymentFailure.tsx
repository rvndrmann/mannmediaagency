
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  useEffect(() => {
    const updateSubscription = async () => {
      const txnId = searchParams.get('txnid');
      if (!txnId) {
        toast({
          title: "Error",
          description: "Invalid transaction ID",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('transaction_id', txnId);

      if (error) {
        console.error('Error updating subscription:', error);
        toast({
          title: "Error",
          description: "Failed to update subscription status",
          variant: "destructive",
        });
      }
    };

    updateSubscription();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Payment Failed</h1>
          <p className="text-gray-600">
            We couldn't process your payment. Please try again or contact support if the problem persists.
          </p>
        </div>
        <Button 
          className="w-full" 
          onClick={() => navigate("/plans")}
        >
          Try Again
        </Button>
      </Card>
    </div>
  );
};

export default PaymentFailure;
