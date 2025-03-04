
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, DollarSign, Lock, AlertTriangle, Calendar } from "lucide-react";
import { PaymentLink as PaymentLinkData } from "@/types/database";

const PaymentLink = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentLinkData | null>(null);
  const [accessCode, setAccessCode] = useState(searchParams.get('code') || "");
  const [accessRequired, setAccessRequired] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    
    fetchPaymentData();
  }, [paymentId]);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Payment link not found");
      }

      // Type assertion to resolve property type issues
      const typedData = data as unknown as PaymentLinkData;
      
      if (!typedData.is_active) {
        throw new Error("This payment link is no longer active");
      }
      
      // Check if payment link is expired
      if (typedData.expiry_date) {
        const expiryDate = new Date(typedData.expiry_date);
        if (expiryDate < new Date()) {
          setIsExpired(true);
        }
      }

      setPaymentData(typedData);
      
      // Check if access code is required
      if (typedData.access_code) {
        setAccessRequired(true);
        
        // Check if code from URL matches
        if (searchParams.get('code') === typedData.access_code) {
          setAccessVerified(true);
        }
      } else {
        setAccessVerified(true);
      }
    } catch (error: any) {
      console.error("Error fetching payment link:", error);
      toast.error(error.message || "Failed to load payment link");
      // Navigate back on error
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const verifyAccessCode = () => {
    if (!paymentData) return;
    
    if (accessCode === paymentData.access_code) {
      setAccessVerified(true);
    } else {
      toast.error("Invalid access code");
    }
  };

  const initiatePayment = async () => {
    if (!paymentData) return;
    
    setInitiating(true);
    
    try {
      // Get current user if logged in, otherwise proceed as anonymous
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      console.log("Initiating payment with:", { 
        userId: userId || "anonymous", 
        title: paymentData.title, 
        amount: paymentData.amount,
      });

      const { data, error } = await supabase.functions.invoke('initiate-payu-payment', {
        body: { 
          userId: userId || "anonymous",
          planName: paymentData.title,
          amount: paymentData.amount
        }
      });

      if (error) {
        console.error('Payment initiation error:', error);
        throw new Error(error.message || "Failed to initiate payment");
      }
      
      // Create a temporary div to hold the payment form
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data;
      document.body.appendChild(tempDiv);

      // Submit the form
      const form = tempDiv.querySelector('form');
      if (form) {
        form.submit();
      } else {
        throw new Error('Invalid payment form received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Failed to initiate payment. Please try again.");
    } finally {
      setInitiating(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
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

  if (isExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold mb-2">Payment Link Expired</h2>
          <p className="mb-4">This payment link has expired and is no longer valid.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (accessRequired && !accessVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
        <Card className="max-w-md w-full glass-card">
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
      <Card className="max-w-md w-full glass-card">
        <CardHeader>
          <CardTitle className="text-white">{paymentData.title}</CardTitle>
          {paymentData.description && (
            <CardDescription className="text-gray-400">{paymentData.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-6 rounded-lg bg-gradient-to-r from-purple-600/30 to-blue-600/30 flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-white/80" />
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(paymentData.amount, paymentData.currency)}
                </div>
              </div>
            </div>
            
            {paymentData.expiry_date && (
              <div className="flex items-center space-x-2 text-white">
                <Calendar className="h-4 w-4 text-white/60" />
                <span className="text-sm">
                  Valid until: {formatDate(paymentData.expiry_date)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={initiatePayment}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={initiating}
          >
            {initiating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Proceed to Payment</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentLink;
