
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle>Payment Cancelled</CardTitle>
          <CardDescription>Your payment process was cancelled</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            The payment process was cancelled or encountered an error. You can try again or contact support if you need assistance.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Button variant="outline" onClick={() => navigate('/')}>Return to Dashboard</Button>
          <Button onClick={() => navigate('/plans')}>Try Again</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentCancel;
