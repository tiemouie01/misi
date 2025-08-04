"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  saveToLocalStorage,
  getAvailableRevenueStreams,
  initializeData,
} from "~/lib/financial-utils";
import type { Loan, LoanPayment, Transaction } from "~/lib/types";

interface LoanPaymentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  onPaymentSaved: () => void;
}

export function LoanPaymentForm({
  isOpen,
  onOpenChange,
  selectedLoan,
  onPaymentSaved,
}: LoanPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const resetForm = () => {
    setAmount("");
    setSelectedRevenueStream("");
    setDate(new Date());
  };

  const handleLoanPayment = () => {
    if (!selectedLoan || !amount || !selectedRevenueStream) return;

    const data = initializeData();
    const paymentAmount = Number.parseFloat(amount);
    const loan = selectedLoan;

    // Calculate interest and principal portions
    const monthlyInterestRate = loan.interestRate / 100 / 12;
    const interestAmount = loan.currentBalance * monthlyInterestRate;
    const principalAmount = Math.max(0, paymentAmount - interestAmount);

    // Create loan payment record
    const newLoanPayment: LoanPayment = {
      id: Date.now().toString(),
      loanId: loan.id,
      amount: paymentAmount,
      principalAmount,
      interestAmount,
      date,
      revenueStream: selectedRevenueStream,
    };

    // Create transaction for the payment (allocated to revenue stream)
    const newTransaction: Transaction = {
      id: (Date.now() + 1).toString(),
      type: "expense",
      amount: paymentAmount,
      category: "Loan Payment",
      description: `${loan.name} - Payment`,
      date,
      revenueStream: selectedRevenueStream,
    };

    // Update loan balance
    const updatedLoan = {
      ...loan,
      currentBalance: Math.max(0, loan.currentBalance - principalAmount),
      nextPaymentDate: new Date(
        loan.nextPaymentDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      ), // Add 30 days
    };

    // Save updated data
    const updatedLoanPayments = [...data.loanPayments, newLoanPayment];
    const updatedTransactions = [...data.transactions, newTransaction];
    const updatedLoans = data.loans.map((l) =>
      l.id === loan.id ? updatedLoan : l,
    );

    saveToLocalStorage("financial-loan-payments", updatedLoanPayments);
    saveToLocalStorage("financial-transactions", updatedTransactions);
    saveToLocalStorage("financial-loans", updatedLoans);

    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));

    resetForm();
    onOpenChange(false);
    onPaymentSaved();
  };

  const data = initializeData();
  const availableRevenueStreams = getAvailableRevenueStreams(
    data.transactions,
    data.categories,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make Loan Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {selectedLoan?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              placeholder={selectedLoan?.monthlyPayment.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass"
            />
          </div>

          <div>
            <Label htmlFor="paymentRevenueStream">Payment Source</Label>
            <Select
              value={selectedRevenueStream}
              onValueChange={setSelectedRevenueStream}
            >
              <SelectTrigger className="glass">
                <SelectValue placeholder="Select revenue stream" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                {availableRevenueStreams.map((stream) => (
                  <SelectItem key={stream.id} value={stream.name}>
                    {stream.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "glass w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="glass-card w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass"
          >
            Cancel
          </Button>
          <Button onClick={handleLoanPayment} className="glass-card border-0">
            Record Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
