
import { format } from "date-fns";
import { Check, X, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Transaction {
  created_at: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const getStatusIcon = (status: string, payment_status: string) => {
  if (status === 'completed' && payment_status === 'success') {
    return <Check className="w-4 h-4 text-green-500" />;
  } else if (status === 'failed' || payment_status === 'failure') {
    return <X className="w-4 h-4 text-red-500" />;
  }
  return <Clock className="w-4 h-4 text-yellow-500" />;
};

export const TransactionHistory = ({ transactions, isLoading }: TransactionHistoryProps) => {
  return (
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
  );
};
