
import { Check } from "lucide-react";

interface PlanFeaturesProps {
  features: string[];
}

export const PlanFeatures = ({ features }: PlanFeaturesProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">This includes:</p>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};
