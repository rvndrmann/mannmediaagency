
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductAdScriptGenerator } from "@/components/product-ad/ProductAdScriptGenerator";
import { ProductAdShots } from "@/components/product-ad/ProductAdShots";
import { ProductAdVideoGenerator } from "@/components/product-ad/ProductAdVideoGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

export default function ProductAd() {
  const navigate = useNavigate();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
  });

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["product-ad-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Product Ad Generator</h1>
      <div className="bg-gray-900 rounded-lg p-6">
        <Tabs defaultValue="script" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="script">1. Generate Script</TabsTrigger>
            <TabsTrigger value="shots">2. Generate Shots</TabsTrigger>
            <TabsTrigger value="video">3. Create Video</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <TabsContent value="script">
              <ProductAdScriptGenerator
                activeProjectId={activeProjectId}
                onProjectCreated={setActiveProjectId}
              />
            </TabsContent>

            <TabsContent value="shots">
              <ProductAdShots
                projectId={activeProjectId}
                onComplete={() => {}}
              />
            </TabsContent>

            <TabsContent value="video">
              <ProductAdVideoGenerator
                projectId={activeProjectId}
                onComplete={() => {}}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
