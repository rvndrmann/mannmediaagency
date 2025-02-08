
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const PaymentFailure = () => {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle>Payment Failed</CardTitle>
          <CardDescription>There was an issue with your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            We couldn't process your payment. Please try again or contact support if the issue persists.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/')}>Return to Dashboard</Button>
          <Button onClick={() => router.push('/plans')}>Try Again</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentFailure;
