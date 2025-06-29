
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PlanProps {
  name: string;
  credits: string;
  price: string;
  originalPrice?: string;
  billing: string;
  features: string[];
  creditCosts?: {
    title: string;
    items: { name: string; cost: string }[];
  }[];
  onSubscribe: () => void;
}

export const PlanCard = ({
  name,
  credits,
  price,
  originalPrice,
  billing,
  features,
  creditCosts,
  onSubscribe,
}: PlanProps) => {
  return (
    <Card className="p-6 bg-card text-card-foreground border-border">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">{credits}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-foreground">{price}</div>
            {originalPrice && (
              <div className="text-lg text-muted-foreground line-through">
                {originalPrice}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{billing}</div>
        </div>

        <Button
          onClick={onSubscribe}
          className="w-[135px] bg-primary hover:bg-primary/90 font-extrabold text-xs py-[11px] px-0 rounded-[3.229px] text-primary-foreground"
        >
          Buy Now
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">This includes:</p>
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </Card>
  );
};
