
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { planName, amount, orderId } = location.state || {};

  useEffect(() => {
    if (!planName || !amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid plan details. Please select a plan first.",
      });
      navigate("/plans");
    }
  }, [planName, amount, navigate, toast]);

  const initiatePayment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get guest id from order if this is a guest order
      let userId = user?.id;
      let guestId = null;
      
      if (!userId && orderId) {
        // For guest orders, get the guest_id from the order
        const { data: orderData, error: orderError } = await supabase
          .from('custom_orders')
          .select('guest_id')
          .eq('id', orderId)
          .single();
          
        if (orderError) {
          console.error('Error fetching order:', orderError);
          throw new Error('Unable to process payment for this order.');
        }
        
        guestId = orderData.guest_id;
        
        if (!guestId) {
          throw new Error('Guest information not found. Please try again.');
        }
      } else if (!userId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please login to continue",
        });
        navigate("/auth");
        return;
      }

      console.log("Initiating payment with:", { 
        userId, 
        guestId,
        planName, 
        amount,
        orderId
      });

      const { data, error } = await supabase.functions.invoke('initiate-payu-payment', {
        body: { 
          userId: userId,
          guestId: guestId,
          planName,
          amount,
          orderId
        }
      });

      if (error) {
        console.error('Payment initiation error:', error);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: error.message || "Failed to initiate payment. Please try again.",
        });
        return;
      }
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data;
      document.body.appendChild(tempDiv);

      const form = tempDiv.querySelector('form');
      if (form) {
        form.submit();
      } else {
        throw new Error('Invalid payment form received');
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

  if (!planName || !amount) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full glass-card">
        <CardHeader>
          <CardTitle className="text-white">Complete Your Payment</CardTitle>
          <CardDescription className="text-gray-400">Secure payment processing with PayU</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-white">
              <span>Plan</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>Amount</span>
              <span className="font-medium">₹{amount}</span>
            </div>
            {orderId && (
              <div className="flex justify-between text-white">
                <span>Order ID</span>
                <span className="font-medium text-xs">{orderId}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            onClick={() => orderId ? navigate("/") : navigate("/plans")}
            className="text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            onClick={initiatePayment}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            Proceed to Payment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Payment;
