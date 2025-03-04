
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentLink as PaymentLinkType, DbPaymentLink } from "@/types/database";
import { paymentLinksTable } from "@/utils/supabase-helpers";
import { Loader2, AlertTriangle, Lock } from "lucide-react";

const PaymentLink = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkType | null>(null);
  const [accessCode, setAccessCode] = useState(searchParams.get('code') || "");
  const [accessRequired, setAccessRequired] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);

  useEffect(() => {
    if (!linkId) return;
    
    fetchPaymentLink();
  }, [linkId]);

  const fetchPaymentLink = async () => {
    setLoading(true);
    try {
      const { data, error } = await paymentLinksTable()
        .select("*")
        .eq("id", linkId)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Payment link not found");
      }
      
      if (!data.is_active) {
        throw new Error("This payment link is no longer active");
      }
      
      // Check if link has expired
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        throw new Error("This payment link has expired");
      }
      
      setPaymentLink(data as PaymentLinkType);
      
      // Check if access code is required
      if (data.access_code) {
        setAccessRequired(true);
        
        // Check if code from URL matches
        if (searchParams.get('code') === data.access_code) {
          setAccessVerified(true);
        }
      } else {
        setAccessVerified(true);
      }
    } catch (error: any) {
      console.error("Error fetching payment link:", error);
      toast.error(error.message || "Failed to load payment link");
      // Navigate to home on error
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const verifyAccessCode = () => {
    if (!paymentLink) return;
    
    if (accessCode === paymentLink.access_code) {
      setAccessVerified(true);
    } else {
      toast.error("Invalid access code");
    }
  };

  const handlePayment = async () => {
    if (!paymentLink) return;
    
    // Here you would implement your payment processing logic
    // For now, we'll just show a toast
    toast.success(`Processing payment of ${paymentLink.currency} ${paymentLink.amount}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading payment link...</p>
        </div>
      </div>
    );
  }

  if (!paymentLink) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold mb-2">Payment Link Not Found</h2>
          <p className="mb-4">The payment link you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (accessRequired && !accessVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please enter the access code to view this payment link</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input 
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code"
                type="password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={verifyAccessCode} className="w-full">
              <Lock className="h-4 w-4 mr-2" />
              Verify Access
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{paymentLink.title}</CardTitle>
          {paymentLink.description && (
            <CardDescription>
              {paymentLink.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Amount to pay:</p>
            <div className="text-4xl font-bold mb-6">
              {paymentLink.currency === 'INR' ? '₹' : 
               paymentLink.currency === 'USD' ? '$' : 
               paymentLink.currency === 'EUR' ? '€' : 
               paymentLink.currency === 'GBP' ? '£' : ''} 
              {paymentLink.amount}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={handlePayment}
          >
            Pay Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentLink;
