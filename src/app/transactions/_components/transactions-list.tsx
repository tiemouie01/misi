import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Edit, Trash2, ArrowRight, Droplets } from "lucide-react";
import {
  initializeData,
  getCategoryName,
  getCategoryColor,
} from "~/lib/financial-utils";
import type { Transaction } from "~/lib/types";

interface TransactionsListProps {
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionsList({
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsListProps) {
  const data = initializeData();
  const { transactions, categories } = data;

  return (
    <Card className="glass-card border-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-muted/30">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Revenue Stream</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-12 text-center"
                >
                  <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                    <Droplets className="h-8 w-8" />
                  </div>
                  <p>
                    No transactions yet. Add your first transaction to get
                    started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              transactions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="border-muted/20 hover:bg-muted/10"
                  >
                    <TableCell>
                      {format(transaction.date, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === "income"
                            ? "default"
                            : "destructive"
                        }
                        className="glass"
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getCategoryColor(transaction.category, categories)}`}
                        />
                        <span>
                          {getCategoryName(transaction.category, categories)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      {transaction.revenueStream ? (
                        <div className="flex items-center space-x-1">
                          <ArrowRight className="text-muted-foreground h-3 w-3" />
                          <span className="text-sm">
                            {transaction.revenueStream}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        transaction.type === "income"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}$
                      {transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTransaction(transaction)}
                          className="glass"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="glass"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function TransactionsListSkeleton() {
  return (
    <Card className="glass-card border-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-muted/30">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Revenue Stream</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-muted/20">
                <TableCell>
                  <div className="bg-muted/30 h-4 w-20 animate-pulse rounded"></div>
                </TableCell>
                <TableCell>
                  <div className="bg-muted/30 h-6 w-16 animate-pulse rounded"></div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="bg-muted/30 h-3 w-3 animate-pulse rounded-full"></div>
                    <div className="bg-muted/30 h-4 w-20 animate-pulse rounded"></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="bg-muted/30 h-4 w-32 animate-pulse rounded"></div>
                </TableCell>
                <TableCell>
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
                </TableCell>
                <TableCell>
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <div className="bg-muted/30 h-8 w-8 animate-pulse rounded"></div>
                    <div className="bg-muted/30 h-8 w-8 animate-pulse rounded"></div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
