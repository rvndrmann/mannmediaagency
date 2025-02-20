
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TransactionHistory } from "@/components/plans/TransactionHistory";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";
import { useAuth } from "@/components/auth/AuthProvider";
import { DiscountSection } from "@/components/plans/DiscountSection";
import { PlanList } from "@/components/plans/PlanList";
import { usePlans } from "@/hooks/usePlans";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
}

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    discountCode,
    setDiscountCode,
    activeDiscount,
    isValidatingCode,
    validateDiscountCode,
    calculateDiscountedPrice,
    handleSubscribe
  } = usePlans(session?.user ?? null);

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

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!session?.user) return;
      
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', session.user.id)
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
  }, [session?.user]);

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

          <DiscountSection
            discountCode={discountCode}
            setDiscountCode={setDiscountCode}
            handleApplyDiscount={handleApplyDiscount}
            isValidatingCode={isValidatingCode}
            activeDiscount={activeDiscount}
          />
          
          <PlanList
            calculateDiscountedPrice={calculateDiscountedPrice}
            handleSubscribe={handleSubscribe}
            hasActiveDiscount={!!activeDiscount}
          />

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
