
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TransactionHistory } from "@/components/plans/TransactionHistory";
import { PlanCard } from "@/components/plans/PlanCard";

interface Transaction {
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
}

const Plans = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const plans = [
    {
      name: "BASIC",
      credits: "10 Credits",
      videos: "1 video",
      price: "₹299",
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
      price: "₹2499",
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

  const handleSubscribe = (plan: typeof plans[0]) => {
    const amount = parseInt(plan.price.replace("₹", ""));
    navigate("/payment", { 
      state: { 
        planName: plan.name,
        amount: amount
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              {...plan}
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
