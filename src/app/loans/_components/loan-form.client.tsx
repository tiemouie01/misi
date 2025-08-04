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
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  saveToLocalStorage,
  calculateMonthlyPayment,
  getAvailableRevenueStreams,
  validateLoan,
  initializeData,
} from "~/lib/financial-utils";
import type { Loan, Transaction, Category } from "~/lib/types";

interface LoanFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingLoan: Loan | null;
  onLoanSaved: () => void;
}

export function LoanForm({
  isOpen,
  onOpenChange,
  editingLoan,
  onLoanSaved,
}: LoanFormProps) {
  const [loanType, setLoanType] = useState<"borrowed" | "lent">("borrowed");
  const [loanName, setLoanName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [loanRevenueStream, setLoanRevenueStream] = useState("");
  const [loanCategory, setLoanCategory] = useState("");
  const [loanDescription, setLoanDescription] = useState("");

  // Initialize form when editing loan changes
  useState(() => {
    if (editingLoan) {
      setLoanType(editingLoan.type);
      setLoanName(editingLoan.name);
      setPrincipalAmount(editingLoan.principalAmount.toString());
      setInterestRate(editingLoan.interestRate.toString());
      setTermMonths(editingLoan.termMonths.toString());
      setStartDate(editingLoan.startDate);
      setLoanRevenueStream(editingLoan.revenueStreamAllocation ?? "");
      setLoanCategory(editingLoan.category);
      setLoanDescription(editingLoan.description);
    } else {
      resetForm();
    }
  });

  const resetForm = () => {
    setLoanName("");
    setPrincipalAmount("");
    setInterestRate("");
    setTermMonths("");
    setStartDate(new Date());
    setLoanRevenueStream("");
    setLoanCategory("");
    setLoanDescription("");
  };

  const handleAddLoan = () => {
    if (
      !validateLoan(
        loanType,
        loanName,
        principalAmount,
        interestRate,
        termMonths,
        loanRevenueStream,
      )
    )
      return;

    const data = initializeData();
    const principal = Number.parseFloat(principalAmount);
    const rate = Number.parseFloat(interestRate);
    const months = Number.parseInt(termMonths);
    const monthlyPayment = calculateMonthlyPayment(principal, rate, months);

    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const newLoan: Loan = {
      id: editingLoan?.id ?? Date.now().toString(),
      type: loanType,
      name: loanName,
      principalAmount: principal,
      currentBalance: principal,
      interestRate: rate,
      termMonths: months,
      monthlyPayment,
      startDate,
      nextPaymentDate,
      revenueStreamAllocation:
        loanType === "borrowed" ? loanRevenueStream : undefined,
      category: loanCategory,
      description: loanDescription,
    };

    let updatedLoans;
    if (editingLoan) {
      updatedLoans = data.loans.map((l) =>
        l.id === editingLoan.id ? newLoan : l,
      );
    } else {
      updatedLoans = [...data.loans, newLoan];
    }

    saveToLocalStorage("financial-loans", updatedLoans);
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));

    resetForm();
    onOpenChange(false);
    onLoanSaved();
  };

  const data = initializeData();
  const availableRevenueStreams = getAvailableRevenueStreams(
    data.transactions,
    data.categories,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingLoan ? "Edit Loan" : "Add New Loan"}
          </DialogTitle>
          <DialogDescription>
            {editingLoan
              ? "Update the loan details below."
              : "Enter the details for your new loan."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loanType">Loan Type</Label>
              <Select
                value={loanType}
                onValueChange={(value: "borrowed" | "lent") =>
                  setLoanType(value)
                }
              >
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="borrowed">Money I Borrowed</SelectItem>
                  <SelectItem value="lent">Money I Lent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="loanName">Loan Name</Label>
              <Input
                id="loanName"
                placeholder="e.g., Car Loan, Personal Loan"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                className="glass"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="principalAmount">Principal Amount</Label>
              <Input
                id="principalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="glass"
              />
            </div>
            <div>
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                placeholder="5.00"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="glass"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="termMonths">Term (Months)</Label>
              <Input
                id="termMonths"
                type="number"
                placeholder="36"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="glass"
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "glass w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="glass-card w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loanType === "borrowed" && (
            <div>
              <Label htmlFor="loanRevenueStream">
                Payment Source (Revenue Stream)
              </Label>
              <Select
                value={loanRevenueStream}
                onValueChange={setLoanRevenueStream}
              >
                <SelectTrigger className="glass">
                  <SelectValue placeholder="Select revenue stream for payments" />
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
          )}

          <div>
            <Label htmlFor="loanCategory">Category</Label>
            <Select value={loanCategory} onValueChange={setLoanCategory}>
              <SelectTrigger className="glass">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                <SelectItem value="Student Loan">Student Loan</SelectItem>
                <SelectItem value="Mortgage">Mortgage</SelectItem>
                <SelectItem value="Business Loan">Business Loan</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="loanDescription">Description</Label>
            <Textarea
              id="loanDescription"
              placeholder="Additional details about the loan..."
              value={loanDescription}
              onChange={(e) => setLoanDescription(e.target.value)}
              className="glass"
            />
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
          <Button onClick={handleAddLoan} className="glass-card border-0">
            {editingLoan ? "Update" : "Add"} Loan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
