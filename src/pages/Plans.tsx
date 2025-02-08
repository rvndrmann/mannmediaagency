
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Plans = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "BASIC",
      credits: "30 Credits",
      videos: "3 videos per month",
      price: "₹899",
      billing: "One-time payment",
      features: [
        "Create 3 videos (10 credits each)",
        "Background Music",
        "No Watermark",
        "HD Video Resolution"
      ]
    },
    {
      name: "PRO",
      credits: "100 Credits",
      videos: "10 videos per month",
      price: "₹2499",
      billing: "One-time payment",
      features: [
        "Create 10 videos (10 credits each)",
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

  return (
    <div className="min-h-screen bg-background p-6">
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
        
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1 mb-8">
          <Button variant="default" className="rounded-full">One-time</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.credits}</p>
                  <p className="text-sm text-gray-500">{plan.videos}</p>
                </div>
                
                <div>
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <div className="text-sm text-gray-500">{plan.billing}</div>
                </div>

                <Button 
                  onClick={() => handleSubscribe(plan)}
                  className="w-[135px] bg-payu hover:bg-payu/90 font-extrabold text-xs py-[11px] px-0 rounded-[3.229px]"
                >
                  Subscribe Now
                </Button>

                <div className="space-y-2">
                  <p className="text-sm font-medium">This includes:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
