
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Check, X, Clock } from "lucide-react";

interface Transaction {
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
}

const Plans = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const plans = [
    {
      name: "BASIC",
      credits: "30 Credits",
      videos: "3 videos per month",
      price: "₹50",
      billing: "One-time payment",
      features: [
        "Create 3 videos (10 credits each)",
        "Background Music",
        "No Watermark",
        "HD Video Resolution"
      ]
    },
    {
      name: "PRO",
      credits: "100 Credits",
      videos: "10 videos per month",
      price: "₹2499",
      billing: "One-time payment",
      features: [
        "Create 10 videos (10 credits each)",
        "Background Music",
        "No Watermark",
        "HD Video Resolution",
        "Priority Support"
      ]
    }
  ];

  const handleSubscribe = (plan: typeof plans[0]) => {
    const amount = parseInt(plan.price.replace("₹", ""));
    navigate("/payment", { 
      state: { 
        planName: plan.name,
        amount: amount
      } 
    });
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }

        setTransactions(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getStatusIcon = (status: string, payment_status: string) => {
    if (status === 'completed' && payment_status === 'success') {
      return <Check className="w-4 h-4 text-green-500" />;
    } else if (status === 'failed' || payment_status === 'failure') {
      return <X className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Your Plan</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1 mb-8">
          <Button variant="default" className="rounded-full">One-time</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {plans.map((plan) => (
            <Card key={plan.name} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.credits}</p>
                  <p className="text-sm text-gray-500">{plan.videos}</p>
                </div>
                
                <div>
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <div className="text-sm text-gray-500">{plan.billing}</div>
                </div>

                <Button 
                  onClick={() => handleSubscribe(plan)}
                  className="w-[135px] bg-payu hover:bg-payu/90 font-extrabold text-xs py-[11px] px-0 rounded-[3.229px]"
                >
                  Subscribe Now
                </Button>

                <div className="space-y-2">
                  <p className="text-sm font-medium">This includes:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          {isLoading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No transactions found</div>
          ) : (
            <Card className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.transaction_id}>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>₹{transaction.amount}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {getStatusIcon(transaction.status, transaction.payment_status)}
                        <span className={
                          transaction.status === 'completed' && transaction.payment_status === 'success'
                            ? 'text-green-500'
                            : transaction.status === 'failed' || transaction.payment_status === 'failure'
                            ? 'text-red-500'
                            : 'text-yellow-500'
                        }>
                          {transaction.status === 'completed' && transaction.payment_status === 'success'
                            ? 'Success'
                            : transaction.status === 'failed' || transaction.payment_status === 'failure'
                            ? 'Failed'
                            : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {transaction.transaction_id.slice(0, 12)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Plans;
