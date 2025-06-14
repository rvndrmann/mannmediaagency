
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  user_id: string;
  credits_remaining: number;
  credits?: number;
}

export function useUserCredits() {
  return useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining, user_id")
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserCredits;
    },
  });
}
