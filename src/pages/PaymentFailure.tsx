
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full glass-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-white">Payment Failed</CardTitle>
          <CardDescription className="text-gray-400">There was an issue with your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center">
            We couldn't process your payment. Please try again or contact support if the issue persists.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10"
          >
            Return to Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/billing')}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentFailure;
