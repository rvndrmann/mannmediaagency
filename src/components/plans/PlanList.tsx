
import { PlanCard } from "./PlanCard";
import { PLANS } from "@/constants/plans";

interface PlanListProps {
  calculateDiscountedPrice: (price: number) => number;
  handleSubscribe: (planName: string, price: number) => Promise<void>;
  hasActiveDiscount: boolean;
}

export const PlanList = ({
  calculateDiscountedPrice,
  handleSubscribe,
  hasActiveDiscount
}: PlanListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.name}
          {...plan}
          price={`₹${calculateDiscountedPrice(plan.price)}`}
          originalPrice={hasActiveDiscount ? `₹${plan.price}` : undefined}
          onSubscribe={() => handleSubscribe(plan.name, plan.price)}
        />
      ))}
    </div>
  );
};
