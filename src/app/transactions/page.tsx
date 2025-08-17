import { TransactionManagement } from "./_components/transaction-management.client";
import {
  getTransactions,
  getTransactionTemplates,
  getCategories,
  getAvailableRevenueStreams,
} from "~/server/db/queries";

export default async function TransactionsPage() {
  // TODO: Replace with actual user ID from auth context
  const userId = "cmdr1xnpujgm4ta";

  const [txRes, tmplRes, catRes, streamsRes] = await Promise.all([
    getTransactions(userId),
    getTransactionTemplates(userId),
    getCategories(userId),
    getAvailableRevenueStreams(userId),
  ]);

  const transactions = txRes.data ?? [];
  const templates = tmplRes.data ?? [];
  const categories = catRes.data ?? [];
  const availableRevenueStreams = streamsRes.data ?? [];

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
      <TransactionManagement
        transactions={transactions}
        templates={templates}
        categories={categories}
        availableRevenueStreams={availableRevenueStreams}
        userId={userId}
      />
    </div>
  );
}
