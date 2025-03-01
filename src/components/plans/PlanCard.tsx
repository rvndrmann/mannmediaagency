
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
    <Card className="p-6 glass-card">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white">{name}</h3>
          <p className="text-sm text-white/70">{credits}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-white">{price}</div>
            {originalPrice && (
              <div className="text-lg text-white/50 line-through">
                {originalPrice}
              </div>
            )}
          </div>
          <div className="text-sm text-white/70">{billing}</div>
        </div>

        <Button 
          onClick={onSubscribe}
          className="w-[135px] bg-[#1065b7] hover:bg-[#1065b7]/90 font-extrabold text-xs py-[11px] px-0 rounded-[3.229px] text-white"
        >
          Buy Now
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white">This includes:</p>
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature} className="text-sm text-white/80 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {creditCosts && creditCosts.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            {creditCosts.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-sm font-medium text-white">{section.title}:</p>
                <ul className="space-y-1.5">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-xs text-white/70 flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="font-medium text-white/80">{item.cost}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
