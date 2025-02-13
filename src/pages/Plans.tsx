
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TransactionHistory } from "@/components/plans/TransactionHistory";
import { PlanCard } from "@/components/plans/PlanCard";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";

interface Transaction {
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  valid_until: string;
}

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [activeDiscount, setActiveDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const plans = [
    {
      name: "BASIC",
      credits: "10 Credits",
      videos: "1 video",
      price: 299,
      billing: "One-time payment",
      features: [
        "Create 1 video (10 credits)",
        "AI Agent: 1 credit per 1000 words",
        "Background Music",
        "No Watermark",
        "HD Video Resolution"
      ]
    },
    {
      name: "PRO",
      credits: "100 Credits",
      videos: "10 videos",
      price: 2499,
      billing: "One-time payment",
      features: [
        "Create 10 videos (10 credits each)",
        "AI Agent: 1 credit per 1000 words",
        "Background Music",
        "No Watermark",
        "HD Video Resolution",
        "Priority Support"
      ]
    }
  ];

  const validateDiscountCode = async (code: string) => {
    setIsValidatingCode(true);
    try {
      const { data: discountData, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .gt('valid_until', new Date().toISOString())
        .single();

      if (error || !discountData) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "This discount code is invalid or has expired."
        });
        setActiveDiscount(null);
        return;
      }

      // Check if user has already used this code
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please log in to apply discount codes."
        });
        return;
      }

      const { data: usageData } = await supabase
        .from('discount_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('discount_code_id', discountData.id)
        .single();

      if (usageData) {
        toast({
          variant: "destructive",
          title: "Code Already Used",
          description: "You have already used this discount code."
        });
        return;
      }

      setActiveDiscount(discountData);
      toast({
        title: "Discount Applied!",
        description: `${discountData.discount_percentage}% discount has been applied to your purchase.`
      });
    } catch (error) {
      console.error('Error validating discount:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to validate discount code. Please try again."
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a discount code."
      });
      return;
    }
    validateDiscountCode(discountCode.trim());
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!activeDiscount) return originalPrice;
    const discountAmount = (originalPrice * activeDiscount.discount_percentage) / 100;
    return Math.round(originalPrice - discountAmount);
  };

  const handleSubscribe = (plan: typeof plans[0]) => {
    const finalAmount = calculateDiscountedPrice(plan.price);
    navigate("/payment", { 
      state: { 
        planName: plan.name,
        amount: finalAmount,
        originalAmount: plan.price,
        discountCode: activeDiscount?.code,
        discountId: activeDiscount?.id
      } 
    });
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }

        setTransactions(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <>
      <PromotionalBanner />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="mr-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">Choose Your Plan</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-[#222222]/60 backdrop-blur-xl rounded-full p-1 mb-8">
            <Button 
              variant="default" 
              className="rounded-full bg-[#1065b7] hover:bg-[#1065b7]/90 text-white"
            >
              One-time
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex gap-4 max-w-md">
              <Input
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={handleApplyDiscount}
                disabled={isValidatingCode}
                className="bg-[#1065b7] hover:bg-[#1065b7]/90 text-white"
              >
                Apply
              </Button>
            </div>
            {activeDiscount && (
              <p className="text-green-400 text-sm mt-2">
                {activeDiscount.discount_percentage}% discount applied!
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
            {plans.map((plan) => (
              <PlanCard
                key={plan.name}
                {...plan}
                price={`₹${calculateDiscountedPrice(plan.price)}`}
                originalPrice={activeDiscount ? `₹${plan.price}` : undefined}
                onSubscribe={() => handleSubscribe(plan)}
              />
            ))}
          </div>

          <TransactionHistory 
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
};

export default Plans;
