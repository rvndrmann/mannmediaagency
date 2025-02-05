import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { BillingToggle } from "@/components/billing/BillingToggle";
import { PlanCard } from "@/components/billing/PlanCard";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(true);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const plans = [
    {
      name: "STARTER",
      credits: "270 Credits",
      videos: "13 videos per month",
      price: isYearly ? "US$15.83" : "US$19",
      monthlyPrice: 19,
      yearlyPrice: 190,
      billing: isYearly ? "US$190 billed annually" : "Billed monthly",
      features: [
        "Create 3 videos per week",
        "1 Series",
        "Auto-Post To Channel",
        "Background Music",
        "No Watermark"
      ]
    },
    {
      name: "DAILY",
      credits: "630 Credits",
      videos: "30 videos per month",
      price: isYearly ? "US$32.50" : "US$39",
      monthlyPrice: 39,
      yearlyPrice: 390,
      billing: isYearly ? "US$390 billed annually" : "Billed monthly",
      features: [
        "Create 30 videos per month",
        "1 Series",
        "Edit & Preview Videos",
        "Auto-Post To Channel",
        "HD Video Resolution",
        "Background Music",
        "Voice Cloning",
        "No Watermark"
      ]
    },
    {
      name: "ENTERPRISE",
      credits: "1260 Credits",
      videos: "90 videos per month",
      price: isYearly ? "US$49.17" : "US$59",
      monthlyPrice: 59,
      yearlyPrice: 590,
      billing: isYearly ? "US$590 billed annually" : "Billed monthly",
      features: [
        "Create 90 videos per month",
        "1 Series",
        "Edit & Preview Videos",
        "Auto-Post To Channel",
        "HD Video Resolution",
        "Background Music",
        "No Watermark",
        "Download Videos"
      ]
    }
  ];

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to a plan",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      const amount = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
      
      const response = await supabase.functions.invoke('payu-payment', {
        body: {
          plan: plan.name,
          email: user.email,
          amount: amount
        }
      });

      if (response.error) throw response.error;

      const { data: paymentData } = response;

      // Create payment form and submit
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://sandboxsecure.payu.in/_payment';

      Object.entries(paymentData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      // Create subscription record
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_name: plan.name,
        amount: amount,
        status: 'pending',
        transaction_id: paymentData.txnid,
        valid_until: isYearly ? 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="fixed top-0 left-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center mb-8">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/")}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold">Choose Your Plan</h1>
              </div>
              
              <BillingToggle 
                isYearly={isYearly} 
                onToggle={setIsYearly} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.name}
                    plan={plan}
                    onSubscribe={handleSubscribe}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Plans;
