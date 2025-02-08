
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

type PaymentStatus = 'verifying' | 'success' | 'error';

const PaymentSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txnId = searchParams.get('txnId');
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!txnId) {
        setError('Missing transaction ID');
        setStatus('error');
        toast.error("Invalid transaction details");
        return;
      }

      try {
        const { data: transaction, error: fetchError } = await supabase
          .from('payment_transactions')
          .select('status, payment_status')
          .eq('transaction_id', txnId)
          .maybeSingle();

        if (fetchError) {
          console.error('Transaction fetch error:', fetchError);
          throw new Error('Failed to verify payment status');
        }

        if (!transaction) {
          setError('Transaction not found');
          setStatus('error');
          router.push(`/payment/failure?txnId=${txnId}&error=transaction_not_found`);
          return;
        }

        // Check for explicit success status
        if (transaction.status === 'success' || transaction.payment_status === 'success') {
          setStatus('success');
          toast.success("Payment verified successfully!");
        } else {
          setError('Payment verification failed');
          setStatus('error');
          router.push(`/payment/failure?txnId=${txnId}&error=payment_failed&status=${transaction.status}`);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');
        toast.error("Failed to verify payment");
        router.push(`/payment/failure?txnId=${txnId}&error=verification_failed`);
      }
    };

    verifyPayment();
  }, [txnId, router, supabase]);

  if (status === 'verifying') {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we verify your payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              This may take a few moments...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>{error || 'An error occurred during payment verification'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              We encountered an issue while verifying your payment. You will be redirected to the payment failure page.
            </p>
          </CardContent>
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
            Your payment has been processed and verified successfully. You can now continue using our services.
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
