
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txnId = searchParams.get('txnId');
  const [isVerifying, setIsVerifying] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!txnId) {
        toast.error("Invalid transaction ID");
        router.push('/');
        return;
      }

      try {
        const { data: transaction, error } = await supabase
          .from('payment_transactions')
          .select('status')
          .eq('transaction_id', txnId)
          .single();

        if (error) throw error;

        if (!transaction || transaction.status !== 'success') {
          toast.error("Payment verification failed");
          router.push('/payment/failure');
          return;
        }

        setIsVerifying(false);
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error("Failed to verify payment");
        router.push('/payment/failure');
      }
    };

    verifyPayment();
  }, [txnId, router, supabase]);

  if (isVerifying) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Verifying Payment...</CardTitle>
            <CardDescription>Please wait while we verify your payment</CardDescription>
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
            Your payment has been processed successfully. You can now continue using our services.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push('/')}>Return to Dashboard</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
