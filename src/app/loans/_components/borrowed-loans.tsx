import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Edit, Trash2 } from "lucide-react";
import { initializeData } from "~/lib/financial-utils";
import type { Loan } from "~/lib/types";

interface BorrowedLoansProps {
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (id: string) => void;
  onMakePayment: (loan: Loan) => void;
}

export function BorrowedLoans({
  onEditLoan,
  onDeleteLoan,
  onMakePayment,
}: BorrowedLoansProps) {
  const data = initializeData();
  const borrowedLoans = data.loans.filter((l) => l.type === "borrowed");

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="text-rose-400">Money I Borrowed</CardTitle>
        <CardDescription>Loans you need to pay back</CardDescription>
      </CardHeader>
      <CardContent>
        {borrowedLoans.length === 0 ? (
          <p className="text-muted-foreground">No borrowed loans recorded.</p>
        ) : (
          <div className="space-y-4">
            {borrowedLoans.map((loan) => (
              <div
                key={loan.id}
                className="glass rounded-xl border border-rose-400/20 p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{loan.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {loan.category}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMakePayment(loan)}
                      className="glass"
                    >
                      Pay
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditLoan(loan)}
                      className="glass"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLoan(loan.id)}
                      className="glass"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Current Balance:
                    </span>
                    <div className="font-semibold text-rose-400">
                      ${loan.currentBalance.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Monthly Payment:
                    </span>
                    <div className="font-semibold">
                      ${loan.monthlyPayment.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Interest Rate:
                    </span>
                    <div className="font-semibold">{loan.interestRate}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Payment Source:
                    </span>
                    <div className="text-sm font-semibold">
                      {loan.revenueStreamAllocation ?? "Not set"}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {(
                        ((loan.principalAmount - loan.currentBalance) /
                          loan.principalAmount) *
                        100
                      ).toFixed(1)}
                      % paid
                    </span>
                  </div>
                  <Progress
                    value={
                      ((loan.principalAmount - loan.currentBalance) /
                        loan.principalAmount) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function BorrowedLoansSkeleton() {
  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="bg-muted/30 mb-2 h-6 w-32 animate-pulse rounded"></div>
        <div className="bg-muted/30 h-4 w-40 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="glass border-muted/20 rounded-xl border p-4"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="bg-muted/30 h-5 w-24 animate-pulse rounded"></div>
                  <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
                </div>
                <div className="flex space-x-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="bg-muted/30 h-8 w-12 animate-pulse rounded"
                    ></div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="bg-muted/30 h-3 w-20 animate-pulse rounded"></div>
                    <div className="bg-muted/30 h-4 w-16 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <div className="bg-muted/30 h-3 w-full animate-pulse rounded"></div>
                <div className="bg-muted/30 h-2 w-full animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
