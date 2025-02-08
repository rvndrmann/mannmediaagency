
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "User not authenticated",
          });
          navigate('/auth');
          return;
        }

        // Get transaction ID from URL parameters or verify latest pending transaction
        const params = new URLSearchParams(location.search);
        const txnId = params.get('txnid');
        
        // Verify payment status
        const { data, error } = await supabase.functions.invoke('verify-payu-payment', {
          body: { 
            transactionId: txnId,
            userId: user.id
          }
        });

        if (error) {
          throw error;
        }

        if (!data.success || data.status !== 'success') {
          navigate('/payment/failure');
          return;
        }

        // Payment verified successfully
        setVerifying(false);
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          variant: "destructive",
          title: "Verification Error",
          description: "Failed to verify payment status. Please contact support.",
        });
        navigate('/payment/failure');
      }
    };

    verifyPayment();
  }, [location.search, navigate, toast]);

  if (verifying) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we confirm your payment</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle>Payment Successful!</CardTitle>
          <CardDescription>Thank you for your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            Your payment has been processed successfully. Your credits have been added to your account.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
