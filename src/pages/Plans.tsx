import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TransactionHistory } from "@/components/plans/TransactionHistory";
import { PlanCard } from "@/components/plans/PlanCard";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [activeDiscount, setActiveDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const creditCosts = [
    {
      title: "Credit Usage Breakdown",
      items: [
        { name: "AI Video", cost: "20 credits" },
      ]
    }
  ];

  const plans = [
    {
      name: "BASIC",
      credits: "20 Credits",
      price: 600,
      billing: "One-time payment",
      features: [
        "AI Video: 20 credits",
      ]
    },
    {
      name: "PRO",
      credits: "100 Credits",
      price: 2499,
      billing: "One-time payment",
      features: [
        "AI Video: 20 credits",
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
        .maybeSingle();

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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6 md:mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mr-4 text-foreground hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Choose Your Plan</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-card rounded-full p-1 mb-6 md:mb-8">
          <Button
            variant="default"
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            One-time
          </Button>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row gap-4 max-w-md">
            <Input
              placeholder="Enter discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="bg-input border-border text-foreground"
            />
            <Button
              onClick={handleApplyDiscount}
              disabled={isValidatingCode}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Apply
            </Button>
          </div>
          {activeDiscount && (
            <p className="text-green-500 text-sm mt-2">
              {activeDiscount.discount_percentage}% discount applied!
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              {...plan}
              price={`₹${calculateDiscountedPrice(plan.price)}`}
              originalPrice={activeDiscount ? `₹${plan.price}` : undefined}
              creditCosts={creditCosts}
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
  );
};

export default Plans;
