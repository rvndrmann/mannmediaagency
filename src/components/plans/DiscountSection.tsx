
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DiscountCode } from "@/hooks/usePlans";

interface DiscountSectionProps {
  discountCode: string;
  setDiscountCode: (code: string) => void;
  handleApplyDiscount: () => void;
  isValidatingCode: boolean;
  activeDiscount: DiscountCode | null;
}

export const DiscountSection = ({
  discountCode,
  setDiscountCode,
  handleApplyDiscount,
  isValidatingCode,
  activeDiscount,
}: DiscountSectionProps) => {
  return (
    <div className="mb-8">
      <div className="flex gap-4 max-w-md">
        <Input
          placeholder="Enter discount code"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
          className="bg-white/10 border-white/20 text-white"
        />
        <Button
          onClick={handleApplyDiscount}
          disabled={isValidatingCode}
          className="bg-[#1065b7] hover:bg-[#1065b7]/90 text-white"
        >
          Apply
        </Button>
      </div>
      {activeDiscount && (
        <p className="text-green-400 text-sm mt-2">
          {activeDiscount.discount_percentage}% discount applied!
        </p>
      )}
    </div>
  );
};
