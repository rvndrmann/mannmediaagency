
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface DiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  valid_until: string;
}

export const usePlans = (user: User | null) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");
  const [activeDiscount, setActiveDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!activeDiscount) return originalPrice;
    const discountAmount = (originalPrice * activeDiscount.discount_percentage) / 100;
    return Math.round(originalPrice - discountAmount);
  };

  const validateDiscountCode = async (code: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to apply discount codes."
      });
      navigate("/auth/login");
      return;
    }

    setIsValidatingCode(true);
    try {
      const { data: discountData, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .gt('valid_until', new Date().toISOString())
        .single();

      if (error || !discountData) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "This discount code is invalid or has expired."
        });
        setActiveDiscount(null);
        return;
      }

      const { data: usageData } = await supabase
        .from('discount_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('discount_code_id', discountData.id)
        .maybeSingle();

      if (usageData) {
        toast({
          variant: "destructive",
          title: "Code Already Used",
          description: "You have already used this discount code."
        });
        return;
      }

      setActiveDiscount(discountData);
      toast({
        title: "Discount Applied!",
        description: `${discountData.discount_percentage}% discount has been applied to your purchase.`
      });
    } catch (error) {
      console.error('Error validating discount:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to validate discount code. Please try again."
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleSubscribe = async (planName: string, price: number) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to purchase a plan."
      });
      navigate("/auth/login");
      return;
    }

    try {
      const finalAmount = calculateDiscountedPrice(price);
      
      const { data, error } = await supabase.functions.invoke('initiate-payu-payment', {
        body: { 
          userId: user.id,
          planName,
          amount: finalAmount,
          discountCode: activeDiscount?.code,
          discountId: activeDiscount?.id
        }
      });

      if (error) throw error;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.html;
      document.body.appendChild(tempDiv);

      const form = tempDiv.querySelector('form');
      if (form) {
        form.submit();
      } else {
        throw new Error('Payment form not received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again."
      });
    }
  };

  return {
    discountCode,
    setDiscountCode,
    activeDiscount,
    isValidatingCode,
    validateDiscountCode,
    calculateDiscountedPrice,
    handleSubscribe
  };
};
