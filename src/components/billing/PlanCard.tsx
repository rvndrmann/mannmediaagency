
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlanFeatures } from "./PlanFeatures";

interface PlanCardProps {
  plan: {
    name: string;
    credits: string;
    videos: string;
    price: string;
    monthlyPrice: number;
    yearlyPrice: number;
    billing: string;
    features: string[];
  };
  onSubscribe: (plan: PlanCardProps["plan"]) => void;
}

export const PlanCard = ({ plan, onSubscribe }: PlanCardProps) => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-sm text-gray-500">{plan.credits}</p>
          <p className="text-sm text-gray-500">{plan.videos}</p>
        </div>
        
        <div>
          <div className="text-3xl font-bold">{plan.price}</div>
          <div className="text-sm text-gray-500">per month</div>
          <div className="text-sm text-gray-500">{plan.billing}</div>
        </div>

        <Button 
          className="w-full" 
          onClick={() => onSubscribe(plan)}
        >
          Subscribe
        </Button>

        <PlanFeatures features={plan.features} />
      </div>
    </Card>
  );
};
