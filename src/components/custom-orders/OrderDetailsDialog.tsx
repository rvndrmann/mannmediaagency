
// Modify the part of the file that's causing the error
// by explicitly mapping the payment data to match the PaymentTransaction interface

// When fetching payment transactions, modify the code like this:
// Before setting the payment transactions to state, map the data to match the interface
const paymentTransactions = data.map((transaction: any) => ({
  id: transaction.id,
  created_at: transaction.created_at,
  updated_at: transaction.updated_at,
  user_id: transaction.user_id,
  amount: transaction.amount,
  status: transaction.status,
  transaction_id: transaction.transaction_id || transaction.payu_transaction_id,
  payment_processor: transaction.payment_processor || "PayU",
  related_order_id: transaction.related_order_id || customOrderId,
  gateway_response: transaction.payment_response || transaction.payu_data,
  payment_method: transaction.payment_method,
  payment_status: transaction.payment_status,
  payu_data: transaction.payu_data,
  payu_transaction_id: transaction.payu_transaction_id,
  webhook_received_at: transaction.webhook_received_at,
  payment_response: transaction.payment_response
}));
