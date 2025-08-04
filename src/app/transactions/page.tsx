import { TransactionManagement } from "./_components/transaction-management.client";

export default function TransactionsPage() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <TransactionManagement />
    </div>
  );
}
