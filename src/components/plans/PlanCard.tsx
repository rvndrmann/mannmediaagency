
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PlanFeature {
  text: string;
}

interface PlanProps {
  name: string;
  credits: string;
  videos: string;
  price: string;
  billing: string;
  features: string[];
  onSubscribe: () => void;
}

export const PlanCard = ({
  name,
  credits,
  videos,
  price,
  billing,
  features,
  onSubscribe,
}: PlanProps) => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-sm text-gray-500">{credits}</p>
          <p className="text-sm text-gray-500">{videos}</p>
        </div>
        
        <div>
          <div className="text-3xl font-bold">{price}</div>
          <div className="text-sm text-gray-500">{billing}</div>
        </div>

        <Button 
          onClick={onSubscribe}
          className="w-[135px] bg-payu hover:bg-payu/90 font-extrabold text-xs py-[11px] px-0 rounded-[3.229px]"
        >
          Subscribe Now
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium">This includes:</p>
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};
