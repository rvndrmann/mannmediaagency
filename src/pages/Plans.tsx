
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
      videos: "2 videos per month",
      price: "₹899",
      billing: "One-time payment",
      features: [
        "Create 2 videos per month",
        "Background Music",
        "No Watermark",
        "HD Video Resolution"
      ]
    },
    {
      name: "STARTER",
      credits: "270 Credits",
      videos: "13 videos per month",
      price: "US$15.83",
      billing: "US$190 billed annually",
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
      price: "US$32.50",
      billing: "US$390 billed annually",
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
      price: "US$49.17",
      billing: "US$590 billed annually",
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
          <Button variant="ghost" className="rounded-full">Yearly</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  className="w-full" 
                  onClick={() => navigate("/billing")}
                >
                  Subscribe
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
