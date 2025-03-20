import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Payment() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
  });

  const { data: paymentLinks, isLoading: isLoadingPaymentLinks } = useQuery({
    queryKey: ['payment-links'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-payment-links');
      if (error) throw error;
      return data;
    },
  });

  const { data: userCredits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['user-credits'],
    queryFn: async () => {
      if (!session?.user.id) return null;
      
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
  });

  const handlePaymentClick = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    }
  };

  const formatCredits = (credits: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(credits);
  };

  if (isLoadingCredits || isLoadingPaymentLinks) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <h1 className="text-3xl font-bold mb-8">Credits & Billing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-purple-700/50">
          <CardHeader>
            <CardTitle className="text-xl">Available Credits</CardTitle>
            <CardDescription>Your current balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              {userCredits ? formatCredits(userCredits.credits_remaining) : '0'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-700/50">
          <CardHeader>
            <CardTitle className="text-xl">Total Credits Used</CardTitle>
            <CardDescription>Lifetime usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              {userCredits ? formatCredits(userCredits.credits_used) : '0'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 border-emerald-700/50">
          <CardHeader>
            <CardTitle className="text-xl">Subscription Status</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {userCredits?.subscription_status === 'active' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-lg font-medium">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-medium">No Active Plan</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="credits" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        
        <TabsContent value="credits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentLinks?.oneTimeLinks?.map((link: any) => (
              <Card key={link.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>One-time purchase</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-3xl font-bold mb-2">${link.custom_rate}</div>
                  <p className="text-sm text-gray-400">{link.credits} credits</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePaymentClick(link.price_id)}
                  >
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentLinks?.subscriptionLinks?.map((link: any) => (
              <Card key={link.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>Monthly subscription</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-3xl font-bold mb-2">${link.custom_rate}/mo</div>
                  <p className="text-sm text-gray-400">{link.credits} credits/month</p>
                  <ul className="mt-4 space-y-2">
                    {link.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePaymentClick(link.price_id)}
                  >
                    Subscribe
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
