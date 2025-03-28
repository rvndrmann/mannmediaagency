import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const { data: paymentLinks } = useQuery({
    queryKey: ["payment-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("title, custom_rate")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  const selectedPaymentLink = paymentLinks && paymentLinks.length > 0 
    ? { title: paymentLinks[0].title, custom_rate: paymentLinks[0].custom_rate } 
    : { title: '', custom_rate: 0 };

  const [paymentDetails, setPaymentDetails] = useState<{
    planName: string | null;
    amount: number | null;
    orderId: string | null;
  }>({
    planName: null,
    amount: null,
    orderId: null
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async (orderId: string) => {
      try {
        const { data: orderData, error } = await supabase
          .from('custom_orders')
          .select(`
            id, 
            credits_used,
            order_link_id,
            custom_order_links(title, custom_rate)
          `)
          .eq('id', orderId)
          .single();
        
        if (error) throw error;
        
        if (orderData && orderData.custom_order_links) {
          const linkData = orderData.custom_order_links as { title: string, custom_rate: number };
          setPaymentDetails({
            planName: linkData.title || "Custom Order",
            amount: linkData.custom_rate || 0,
            orderId: orderId
          });
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load order details. Please try again.",
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    const stateData = location.state || {};
    const paramOrderId = searchParams.get('orderId');
    
    if (stateData.planName && stateData.amount) {
      setPaymentDetails({
        planName: stateData.planName,
        amount: stateData.amount,
        orderId: stateData.orderId || null
      });
      setIsLoading(false);
    } else if (paramOrderId) {
      fetchOrderDetails(paramOrderId);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid payment details. Please select a plan or order first.",
      });
      setIsLoading(false);
      navigate("/plans");
    }
  }, [location.state, searchParams, navigate, toast]);

  const initiatePayment = async () => {
    try {
      if (!paymentDetails.planName || !paymentDetails.amount) {
        throw new Error("Missing payment details");
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      let userId = user?.id;
      let guestId = null;
      
      if (!userId && paymentDetails.orderId) {
        const { data: orderData, error: orderError } = await supabase
          .from('custom_orders')
          .select('guest_id')
          .eq('id', paymentDetails.orderId)
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
        planName: paymentDetails.planName, 
        amount: paymentDetails.amount,
        orderId: paymentDetails.orderId
      });

      const { data, error } = await supabase.functions.invoke('initiate-payu-payment', {
        body: { 
          userId: userId,
          guestId: guestId,
          planName: paymentDetails.planName,
          amount: paymentDetails.amount,
          orderId: paymentDetails.orderId
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentDetails.planName || !paymentDetails.amount) {
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
              <span className="font-medium">{paymentDetails.planName}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>Amount</span>
              <span className="font-medium">₹{paymentDetails.amount}</span>
            </div>
            {paymentDetails.orderId && (
              <div className="flex justify-between text-white">
                <span>Order ID</span>
                <span className="font-medium text-xs">{paymentDetails.orderId}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            onClick={() => paymentDetails.orderId ? navigate("/") : navigate("/plans")}
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
