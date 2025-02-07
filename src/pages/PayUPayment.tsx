
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const PayUPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { planName, amount } = location.state || { planName: 'BASIC', amount: 899 };

  const initiatePayment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please login to continue",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('initiate-payu-payment', {
        body: { 
          userId: user.id,
          planName,
          amount
        }
      });

      if (error) {
        console.error('Payment initiation error:', error);
        throw error;
      }
      
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>Secure payment processing with PayU</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Plan</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-medium">₹{amount}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={initiatePayment}>Proceed to Payment</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PayUPayment;
