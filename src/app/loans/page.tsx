"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PageHeader } from "~/components/page-header";
import { OverviewCardsGrid } from "~/components/overview-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import {
  CalendarIcon,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  initializeData,
  saveToLocalStorage,
  calculateMonthlyPayment,
  calculateLoanTotals,
  getAvailableRevenueStreams,
  validateLoan,
} from "~/lib/financial-utils";
import type { Loan, LoanPayment, Transaction, Category } from "~/lib/types";

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog states
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isLoanPaymentOpen, setIsLoanPaymentOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);

  // Loan form states
  const [loanType, setLoanType] = useState<"borrowed" | "lent">("borrowed");
  const [loanName, setLoanName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [loanRevenueStream, setLoanRevenueStream] = useState("");
  const [loanCategory, setLoanCategory] = useState("");
  const [loanDescription, setLoanDescription] = useState("");

  // Payment form states
  const [amount, setAmount] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  // Load data on component mount
  useEffect(() => {
    const data = initializeData();
    setLoans(data.loans);
    setLoanPayments(data.loanPayments);
    setTransactions(data.transactions);
    setCategories(data.categories);
  }, []);

  // Save data when it changes
  useEffect(() => {
    saveToLocalStorage("financial-loans", loans);
  }, [loans]);

  useEffect(() => {
    saveToLocalStorage("financial-loan-payments", loanPayments);
  }, [loanPayments]);

  useEffect(() => {
    saveToLocalStorage("financial-transactions", transactions);
    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));
  }, [transactions]);

  const resetLoanForm = () => {
    setLoanName("");
    setPrincipalAmount("");
    setInterestRate("");
    setTermMonths("");
    setStartDate(new Date());
    setLoanRevenueStream("");
    setLoanCategory("");
    setLoanDescription("");
    setEditingLoan(null);
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

    if (editingLoan) {
      setLoans((prev) =>
        prev.map((l) => (l.id === editingLoan.id ? newLoan : l)),
      );
    } else {
      setLoans((prev) => [...prev, newLoan]);
    }

    resetLoanForm();
    setIsAddLoanOpen(false);
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanType(loan.type);
    setLoanName(loan.name);
    setPrincipalAmount(loan.principalAmount.toString());
    setInterestRate(loan.interestRate.toString());
    setTermMonths(loan.termMonths.toString());
    setStartDate(loan.startDate);
    setLoanRevenueStream(loan.revenueStreamAllocation ?? "");
    setLoanCategory(loan.category);
    setLoanDescription(loan.description);
    setIsAddLoanOpen(true);
  };

  const handleDeleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
    setLoanPayments((prev) => prev.filter((p) => p.loanId !== id));
  };

  const handleLoanPayment = () => {
    if (!selectedLoanForPayment || !amount || !selectedRevenueStream) return;

    const paymentAmount = Number.parseFloat(amount);
    const loan = selectedLoanForPayment;

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

    setLoanPayments((prev) => [...prev, newLoanPayment]);
    setTransactions((prev) => [...prev, newTransaction]);
    setLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));

    // Reset form
    setAmount("");
    setSelectedRevenueStream("");
    setDate(new Date());
    setSelectedLoanForPayment(null);
    setIsLoanPaymentOpen(false);
  };

  const availableRevenueStreams = getAvailableRevenueStreams(
    transactions,
    categories,
  );
  const { totalBorrowed, totalLent, monthlyPayments } =
    calculateLoanTotals(loans);

  const overviewCards = [
    {
      title: "Total Borrowed",
      value: `$${totalBorrowed.toFixed(2)}`,
      description: "Outstanding debts",
      icon: TrendingDown,
      iconColor: "bg-rose-400/20",
      valueColor: "text-rose-400",
    },
    {
      title: "Total Lent",
      value: `$${totalLent.toFixed(2)}`,
      description: "Money lent out",
      icon: TrendingUp,
      iconColor: "bg-emerald-400/20",
      valueColor: "text-emerald-400",
    },
    {
      title: "Monthly Payments",
      value: `$${monthlyPayments.toFixed(2)}`,
      description: "Monthly repayment flow",
      icon: DollarSign,
      iconColor: "bg-cyan-400/20",
      valueColor: "text-cyan-400",
    },
    {
      title: "Active Loans",
      value: loans.length.toString(),
      description: "Loans in the system",
      icon: Target,
      iconColor: "bg-indigo-400/20",
      valueColor: "text-indigo-400",
    },
  ];

  return (
    <>
      <PageHeader
        title="Loan Management"
        description="Track borrowed and lent money with payment allocation to revenue streams"
      />

      <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
        <OverviewCardsGrid cards={overviewCards} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="gradient-text mb-2 text-2xl font-semibold">
              Loan Portfolio
            </h3>
            <p className="text-muted-foreground">
              Manage your loans and track payments
            </p>
          </div>
          <Dialog open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetLoanForm();
                  setIsAddLoanOpen(true);
                }}
                className="glass-card border-0 transition-transform hover:scale-105"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Loan
              </Button>
            </DialogTrigger>
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
                        <SelectItem value="borrowed">
                          Money I Borrowed
                        </SelectItem>
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
                      <SelectItem value="Personal Loan">
                        Personal Loan
                      </SelectItem>
                      <SelectItem value="Student Loan">Student Loan</SelectItem>
                      <SelectItem value="Mortgage">Mortgage</SelectItem>
                      <SelectItem value="Business Loan">
                        Business Loan
                      </SelectItem>
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
                  onClick={() => setIsAddLoanOpen(false)}
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
        </div>

        {/* Loans List */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-rose-400">Money I Borrowed</CardTitle>
              <CardDescription>Loans you need to pay back</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.filter((l) => l.type === "borrowed").length === 0 ? (
                <p className="text-muted-foreground">
                  No borrowed loans recorded.
                </p>
              ) : (
                <div className="space-y-4">
                  {loans
                    .filter((l) => l.type === "borrowed")
                    .map((loan) => (
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
                              onClick={() => {
                                setSelectedLoanForPayment(loan);
                                setIsLoanPaymentOpen(true);
                              }}
                              className="glass"
                            >
                              Pay
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLoan(loan)}
                              className="glass"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLoan(loan.id)}
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
                            <div className="font-semibold">
                              {loan.interestRate}%
                            </div>
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

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-emerald-400">Money I Lent</CardTitle>
              <CardDescription>Loans others owe you</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.filter((l) => l.type === "lent").length === 0 ? (
                <p className="text-muted-foreground">No lent loans recorded.</p>
              ) : (
                <div className="space-y-4">
                  {loans
                    .filter((l) => l.type === "lent")
                    .map((loan) => (
                      <div
                        key={loan.id}
                        className="glass rounded-xl border border-emerald-400/20 p-4"
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
                              onClick={() => handleEditLoan(loan)}
                              className="glass"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLoan(loan.id)}
                              className="glass"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Outstanding:
                            </span>
                            <div className="font-semibold text-emerald-400">
                              ${loan.currentBalance.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Expected Monthly:
                            </span>
                            <div className="font-semibold">
                              ${loan.monthlyPayment.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Interest Rate:
                            </span>
                            <div className="font-semibold">
                              {loan.interestRate}%
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Next Payment:
                            </span>
                            <div className="text-sm font-semibold">
                              {format(loan.nextPaymentDate, "MMM dd")}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-sm">
                            <span>Repaid</span>
                            <span>
                              {(
                                ((loan.principalAmount - loan.currentBalance) /
                                  loan.principalAmount) *
                                100
                              ).toFixed(1)}
                              %
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
        </div>

        {/* Loan Payment Dialog */}
        <Dialog open={isLoanPaymentOpen} onOpenChange={setIsLoanPaymentOpen}>
          <DialogContent className="glass-card border-0 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Make Loan Payment</DialogTitle>
              <DialogDescription>
                Record a payment for {selectedLoanForPayment?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder={selectedLoanForPayment?.monthlyPayment.toFixed(
                    2,
                  )}
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
                onClick={() => setIsLoanPaymentOpen(false)}
                className="glass"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoanPayment}
                className="glass-card border-0"
              >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
