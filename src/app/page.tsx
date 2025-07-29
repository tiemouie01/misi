"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
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
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Edit,
  Trash2,
  Zap,
  ArrowRight,
  Droplets,
  Waves,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/theme-toggle";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
  revenueStream?: string; // For expenses - which revenue stream they're allocated to
}

interface TransactionTemplate {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  revenueStream?: string; // For expense templates
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface RevenueStream {
  name: string;
  totalIncome: number;
  allocatedExpenses: number;
  remaining: number;
  color: string;
  expenses: Transaction[];
}

interface Loan {
  id: string;
  type: "borrowed" | "lent";
  name: string;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: Date;
  nextPaymentDate: Date;
  revenueStreamAllocation?: string; // For borrowed loans - which stream pays for it
  category: string;
  description: string;
}

interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  date: Date;
  revenueStream?: string;
}

const defaultIncomeCategories: Category[] = [
  { id: "1", name: "Salary", type: "income", color: "bg-emerald-400" },
  { id: "2", name: "Freelance", type: "income", color: "bg-cyan-400" },
  { id: "3", name: "Business", type: "income", color: "bg-blue-400" },
  { id: "4", name: "Investments", type: "income", color: "bg-indigo-400" },
  { id: "5", name: "Other Income", type: "income", color: "bg-slate-400" },
];

const defaultExpenseCategories: Category[] = [
  { id: "6", name: "Housing", type: "expense", color: "bg-rose-400" },
  { id: "7", name: "Transportation", type: "expense", color: "bg-orange-400" },
  { id: "8", name: "Food & Dining", type: "expense", color: "bg-pink-400" },
  { id: "9", name: "Utilities", type: "expense", color: "bg-purple-400" },
  { id: "10", name: "Healthcare", type: "expense", color: "bg-teal-400" },
  { id: "11", name: "Entertainment", type: "expense", color: "bg-cyan-400" },
  { id: "12", name: "Shopping", type: "expense", color: "bg-violet-400" },
  { id: "13", name: "Other Expenses", type: "expense", color: "bg-slate-400" },
];

const defaultTemplates: TransactionTemplate[] = [
  {
    id: "t1",
    type: "expense",
    amount: 4.5,
    category: "Food & Dining",
    description: "Coffee",
    revenueStream: "Salary",
  },
  {
    id: "t2",
    type: "expense",
    amount: 45.0,
    category: "Transportation",
    description: "Gas Fill-up",
    revenueStream: "Salary",
  },
  {
    id: "t3",
    type: "expense",
    amount: 120.0,
    category: "Food & Dining",
    description: "Groceries",
    revenueStream: "Salary",
  },
  {
    id: "t4",
    type: "expense",
    amount: 12.0,
    category: "Food & Dining",
    description: "Lunch",
    revenueStream: "Freelance",
  },
  {
    id: "t5",
    type: "expense",
    amount: 25.0,
    category: "Entertainment",
    description: "Movie Ticket",
    revenueStream: "Freelance",
  },
];

export default function FinancialTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] =
    useState<TransactionTemplate[]>(defaultTemplates);
  const [categories, setCategories] = useState<Category[]>([
    ...defaultIncomeCategories,
    ...defaultExpenseCategories,
  ]);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<TransactionTemplate | null>(null);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isLoanPaymentOpen, setIsLoanPaymentOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);

  // Form states
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());

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

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem("financial-transactions");
    const savedTemplates = localStorage.getItem("financial-templates");
    const savedCategories = localStorage.getItem("financial-categories");
    const savedLoans = localStorage.getItem("financial-loans");
    const savedLoanPayments = localStorage.getItem("financial-loan-payments");

    if (savedTransactions) {
      try {
        const parsedTransactions = JSON.parse(savedTransactions).map(
          (t: any) => ({
            ...t,
            date: new Date(t.date),
          }),
        ) as Transaction[];
        setTransactions(parsedTransactions);
      } catch (error) {
        console.error("Error parsing transactions:", error);
      }
    }

    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(
          savedTemplates,
        ) as TransactionTemplate[];
        setTemplates(parsedTemplates);
      } catch (error) {
        console.error("Error parsing templates:", error);
      }
    }

    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories) as Category[];
        setCategories(parsedCategories);
      } catch (error) {
        console.error("Error parsing categories:", error);
      }
    }

    if (savedLoans) {
      try {
        const parsedLoans = JSON.parse(savedLoans).map((l: any) => ({
          ...l,
          startDate: new Date(l.startDate),
          nextPaymentDate: new Date(l.nextPaymentDate),
        })) as Loan[];
        setLoans(parsedLoans);
      } catch (error) {
        console.error("Error parsing loans:", error);
      }
    }

    if (savedLoanPayments) {
      try {
        const parsedPayments = JSON.parse(savedLoanPayments).map((p: any) => ({
          ...p,
          date: new Date(p.date),
        })) as LoanPayment[];
        setLoanPayments(parsedPayments);
      } catch (error) {
        console.error("Error parsing loan payments:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(
      "financial-transactions",
      JSON.stringify(transactions),
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("financial-templates", JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem("financial-categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("financial-loans", JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem(
      "financial-loan-payments",
      JSON.stringify(loanPayments),
    );
  }, [loanPayments]);

  const resetForm = () => {
    setAmount("");
    setSelectedCategory("");
    setSelectedRevenueStream("");
    setDescription("");
    setDate(new Date());
    setEditingTransaction(null);
    setEditingTemplate(null);
  };

  const handleAddTransaction = () => {
    if (!amount || !selectedCategory) return;
    if (transactionType === "expense" && !selectedRevenueStream) return;

    const newTransaction: Transaction = {
      id: editingTransaction?.id || Date.now().toString(),
      type: transactionType,
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      description,
      date,
      revenueStream:
        transactionType === "expense" ? selectedRevenueStream : undefined,
    };

    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingTransaction.id ? newTransaction : t)),
      );
    } else {
      setTransactions((prev) => [...prev, newTransaction]);
    }

    resetForm();
    setIsAddTransactionOpen(false);
  };

  const handleAddTemplate = () => {
    if (!amount || !selectedCategory || !description) return;
    if (transactionType === "expense" && !selectedRevenueStream) return;

    const newTemplate: TransactionTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      type: transactionType,
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      description,
      revenueStream:
        transactionType === "expense" ? selectedRevenueStream : undefined,
    };

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? newTemplate : t)),
      );
    } else {
      setTemplates((prev) => [...prev, newTemplate]);
    }

    resetForm();
    setIsAddTemplateOpen(false);
  };

  const handleUseTemplate = (template: TransactionTemplate) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: template.type,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: new Date(),
      revenueStream: template.revenueStream,
    };

    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setSelectedCategory(transaction.category);
    setSelectedRevenueStream(transaction.revenueStream || "");
    setDescription(transaction.description);
    setDate(transaction.date);
    setIsAddTransactionOpen(true);
  };

  const handleEditTemplate = (template: TransactionTemplate) => {
    setEditingTemplate(template);
    setTransactionType(template.type);
    setAmount(template.amount.toString());
    setSelectedCategory(template.category);
    setSelectedRevenueStream(template.revenueStream || "");
    setDescription(template.description);
    setIsAddTemplateOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // Calculate revenue streams with allocated expenses
  const revenueStreams: RevenueStream[] = categories
    .filter((c) => c.type === "income")
    .map((category) => {
      const totalIncome = transactions
        .filter((t) => t.type === "income" && t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);

      const allocatedExpenses = transactions
        .filter(
          (t) => t.type === "expense" && t.revenueStream === category.name,
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions.filter(
        (t) => t.type === "expense" && t.revenueStream === category.name,
      );

      return {
        name: category.name,
        totalIncome,
        allocatedExpenses,
        remaining: totalIncome - allocatedExpenses,
        color: category.color,
        expenses,
      };
    })
    .filter((stream) => stream.totalIncome > 0 || stream.allocatedExpenses > 0);

  const totalIncome = revenueStreams.reduce(
    (sum, stream) => sum + stream.totalIncome,
    0,
  );
  const totalExpenses = revenueStreams.reduce(
    (sum, stream) => sum + stream.allocatedExpenses,
    0,
  );
  const totalRemaining = revenueStreams.reduce(
    (sum, stream) => sum + stream.remaining,
    0,
  );

  // Get available revenue streams for expense allocation
  const availableRevenueStreams = categories
    .filter((c) => c.type === "income")
    .filter((c) =>
      transactions.some((t) => t.type === "income" && t.category === c.name),
    );

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.name === categoryId)?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    return (
      categories.find((c) => c.name === categoryId)?.color || "bg-slate-400"
    );
  };

  const currentCategories = categories.filter(
    (c) => c.type === transactionType,
  );

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

  const calculateMonthlyPayment = (
    principal: number,
    rate: number,
    months: number,
  ) => {
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    return (
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
    );
  };

  const handleAddLoan = () => {
    if (!loanName || !principalAmount || !interestRate || !termMonths) return;
    if (loanType === "borrowed" && !loanRevenueStream) return;

    const principal = Number.parseFloat(principalAmount);
    const rate = Number.parseFloat(interestRate);
    const months = Number.parseInt(termMonths);
    const monthlyPayment = calculateMonthlyPayment(principal, rate, months);

    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const newLoan: Loan = {
      id: editingLoan?.id || Date.now().toString(),
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
    setLoanRevenueStream(loan.revenueStreamAllocation || "");
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

  return (
    <div className="bg-background min-h-screen">
      {/* Floating water droplets background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="float absolute top-20 left-10 h-4 w-4 rounded-full bg-cyan-400/20"></div>
        <div
          className="float absolute top-40 right-20 h-6 w-6 rounded-full bg-blue-400/15"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="float absolute bottom-32 left-1/4 h-3 w-3 rounded-full bg-indigo-400/25"
          style={{ animationDelay: "4s" }}
        ></div>
        <div
          className="float absolute right-1/3 bottom-20 h-5 w-5 rounded-full bg-cyan-400/20"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl p-6">
        {/* Header with glass effect */}
        <div className="glass-card mb-8 rounded-2xl p-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-3">
                <Droplets className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="gradient-text mb-2 text-4xl font-bold">Misi</h1>
                <p className="text-muted-foreground text-lg">
                  Liquid Financial Flow
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="text-muted-foreground flex items-center space-x-2">
            <Waves className="h-4 w-4" />
            <span className="text-sm">
              Track your revenue streams with the fluidity of water
            </span>
          </div>
        </div>

        {/* Financial Overview Cards with glass morphism */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Revenue
              </CardTitle>
              <div className="rounded-lg bg-emerald-400/20 p-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                ${totalIncome.toFixed(2)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Flowing income streams
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Allocated Expenses
              </CardTitle>
              <div className="rounded-lg bg-rose-400/20 p-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">
                ${totalExpenses.toFixed(2)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Distributed costs
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Remaining
              </CardTitle>
              <div className="rounded-lg bg-cyan-400/20 p-2">
                <DollarSign className="h-4 w-4 text-cyan-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-cyan-400" : "text-rose-400"}`}
              >
                ${totalRemaining.toFixed(2)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Available liquidity
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Revenue Streams
              </CardTitle>
              <div className="rounded-lg bg-indigo-400/20 p-2">
                <Target className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-400">
                {revenueStreams.length}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Active sources
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Streams Overview with enhanced glass design */}
        <Card className="glass-card mb-8 border-0">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 p-2">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="gradient-text">
                  Revenue Stream Allocation
                </CardTitle>
                <CardDescription>
                  See how expenses flow through your revenue streams
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueStreams.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                  <Droplets className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground mb-2">
                  No revenue streams yet.
                </p>
                <p className="text-muted-foreground text-sm">
                  Add some income transactions to create flowing revenue
                  streams.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {revenueStreams.map((stream) => (
                  <div
                    key={stream.name}
                    className="glass rounded-xl p-6 transition-transform duration-300 hover:scale-[1.02]"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-4 w-4 rounded-full ${stream.color}`}
                        />
                        <h3 className="text-lg font-semibold">{stream.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-sm">
                          Remaining
                        </div>
                        <div
                          className={`text-xl font-bold ${stream.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          ${stream.remaining.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                        <div className="text-muted-foreground text-sm">
                          Total Income
                        </div>
                        <div className="text-lg font-semibold text-emerald-400">
                          ${stream.totalIncome.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-center">
                        <div className="text-muted-foreground text-sm">
                          Allocated Expenses
                        </div>
                        <div className="text-lg font-semibold text-rose-400">
                          ${stream.allocatedExpenses.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-center">
                        <div className="text-muted-foreground text-sm">
                          Utilization
                        </div>
                        <div className="text-lg font-semibold text-cyan-400">
                          {stream.totalIncome > 0
                            ? (
                                (stream.allocatedExpenses /
                                  stream.totalIncome) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Allocation Progress
                        </span>
                        <span className="text-muted-foreground">
                          ${stream.allocatedExpenses.toFixed(2)} / $
                          {stream.totalIncome.toFixed(2)}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={
                            stream.totalIncome > 0
                              ? (stream.allocatedExpenses /
                                  stream.totalIncome) *
                                100
                              : 0
                          }
                          className="bg-muted/30 h-3"
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20"></div>
                      </div>
                    </div>

                    {stream.expenses.length > 0 && (
                      <div>
                        <h4 className="text-muted-foreground mb-3 font-medium">
                          Allocated Expenses:
                        </h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {stream.expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="bg-muted/20 border-muted/30 flex items-center justify-between rounded-lg border p-3 text-sm"
                            >
                              <span className="truncate">
                                {expense.description}
                              </span>
                              <span className="ml-2 font-medium text-rose-400">
                                ${expense.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Tabs with glass design */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <div className="glass-card rounded-xl p-2">
            <TabsList className="grid w-full grid-cols-4 bg-transparent">
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="loans"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Loans
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Quick Add Templates
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Categories
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="gradient-text text-2xl font-semibold">
                  All Transactions
                </h2>
                <p className="text-muted-foreground">
                  Track your financial flow
                </p>
              </div>
              <Dialog
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsAddTransactionOpen(true);
                    }}
                    className="glass-card border-0 transition-transform hover:scale-105"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-0 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransaction
                        ? "Edit Transaction"
                        : "Add New Transaction"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTransaction
                        ? "Update the transaction details below."
                        : "Enter the details for your new transaction."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={transactionType}
                          onValueChange={(value: "income" | "expense") =>
                            setTransactionType(value)
                          }
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="glass"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          {currentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <Label htmlFor="revenueStream">
                          Allocate to Revenue Stream
                        </Label>
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
                        {availableRevenueStreams.length === 0 && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            Add some income first to create revenue streams.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter transaction description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="glass"
                      />
                    </div>

                    <div>
                      <Label>Date</Label>
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
                            {date ? (
                              format(date, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                      onClick={() => setIsAddTransactionOpen(false)}
                      className="glass"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddTransaction}
                      className="glass-card border-0"
                    >
                      {editingTransaction ? "Update" : "Add"} Transaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
                            No transactions yet. Add your first transaction to
                            get started.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
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
                                  className={`h-3 w-3 rounded-full ${getCategoryColor(transaction.category)}`}
                                />
                                <span>
                                  {getCategoryName(transaction.category)}
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
                                  onClick={() =>
                                    handleEditTransaction(transaction)
                                  }
                                  className="glass"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteTransaction(transaction.id)
                                  }
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
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="gradient-text text-2xl font-semibold">
                  Loan Management
                </h2>
                <p className="text-muted-foreground">
                  Track borrowed and lent money with payment allocation to
                  revenue streams
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
                        <Label htmlFor="principalAmount">
                          Principal Amount
                        </Label>
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
                      <Select
                        value={loanCategory}
                        onValueChange={setLoanCategory}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                          <SelectItem value="Personal Loan">
                            Personal Loan
                          </SelectItem>
                          <SelectItem value="Student Loan">
                            Student Loan
                          </SelectItem>
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
                    <Button
                      onClick={handleAddLoan}
                      className="glass-card border-0"
                    >
                      {editingLoan ? "Update" : "Add"} Loan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Loan Overview Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Total Borrowed
                  </CardTitle>
                  <div className="rounded-lg bg-rose-400/20 p-2">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-400">
                    $
                    {loans
                      .filter((l) => l.type === "borrowed")
                      .reduce((sum, l) => sum + l.currentBalance, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Outstanding debts
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Total Lent
                  </CardTitle>
                  <div className="rounded-lg bg-emerald-400/20 p-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    $
                    {loans
                      .filter((l) => l.type === "lent")
                      .reduce((sum, l) => sum + l.currentBalance, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Money lent out
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Monthly Payments
                  </CardTitle>
                  <div className="rounded-lg bg-cyan-400/20 p-2">
                    <DollarSign className="h-4 w-4 text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-400">
                    $
                    {loans
                      .filter((l) => l.type === "borrowed")
                      .reduce((sum, l) => sum + l.monthlyPayment, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Monthly repayment flow
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 transition-transform duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Active Loans
                  </CardTitle>
                  <div className="rounded-lg bg-indigo-400/20 p-2">
                    <Target className="h-4 w-4 text-indigo-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-400">
                    {loans.length}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Loans in the system
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Loans List */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-rose-400">
                    Money I Borrowed
                  </CardTitle>
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
                                  {loan.revenueStreamAllocation || "Not set"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-sm">
                                <span>Progress</span>
                                <span>
                                  {(
                                    ((loan.principalAmount -
                                      loan.currentBalance) /
                                      loan.principalAmount) *
                                    100
                                  ).toFixed(1)}
                                  % paid
                                </span>
                              </div>
                              <Progress
                                value={
                                  ((loan.principalAmount -
                                    loan.currentBalance) /
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
                  <CardTitle className="text-emerald-400">
                    Money I Lent
                  </CardTitle>
                  <CardDescription>Loans others owe you</CardDescription>
                </CardHeader>
                <CardContent>
                  {loans.filter((l) => l.type === "lent").length === 0 ? (
                    <p className="text-muted-foreground">
                      No lent loans recorded.
                    </p>
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
                                    ((loan.principalAmount -
                                      loan.currentBalance) /
                                      loan.principalAmount) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <Progress
                                value={
                                  ((loan.principalAmount -
                                    loan.currentBalance) /
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
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="gradient-text text-2xl font-semibold">
                  Quick Add Templates
                </h2>
                <p className="text-muted-foreground">
                  Create templates for common transactions with pre-allocated
                  revenue streams
                </p>
              </div>
              <Dialog
                open={isAddTemplateOpen}
                onOpenChange={setIsAddTemplateOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsAddTemplateOpen(true);
                    }}
                    className="glass-card border-0 transition-transform hover:scale-105"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-0 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Edit Template" : "Add New Template"}
                    </DialogTitle>
                    <DialogDescription>
                      Create a template for transactions you make frequently.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={transactionType}
                          onValueChange={(value: "income" | "expense") =>
                            setTransactionType(value)
                          }
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="glass"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          {currentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <Label htmlFor="revenueStream">
                          Default Revenue Stream
                        </Label>
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
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="e.g., Coffee, Gas Fill-up, Lunch"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="glass"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTemplateOpen(false)}
                      className="glass"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddTemplate}
                      className="glass-card border-0"
                    >
                      {editingTemplate ? "Update" : "Add"} Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="glass transition-transform duration-300 hover:scale-[1.02]"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getCategoryColor(template.category)}`}
                        />
                        <Badge
                          variant={
                            template.type === "income"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {template.type}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="glass"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="glass"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">{template.description}</h3>
                      <p className="text-muted-foreground text-sm">
                        {template.category}
                      </p>
                      {template.revenueStream && (
                        <div className="text-muted-foreground flex items-center space-x-1 text-sm">
                          <ArrowRight className="h-3 w-3" />
                          <span>{template.revenueStream}</span>
                        </div>
                      )}
                      <div
                        className={`text-lg font-bold ${template.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {template.type === "income" ? "+" : "-"}$
                        {template.amount.toFixed(2)}
                      </div>
                    </div>

                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="glass-card border-0"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <Card className="glass">
                <CardContent className="py-8 text-center">
                  <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                    <Droplets className="h-8 w-8" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No templates created yet.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Create templates for common transactions with pre-allocated
                    revenue streams.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <h2 className="gradient-text text-2xl font-semibold">
              Transaction Categories
            </h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-emerald-400">
                    Income Categories (Revenue Streams)
                  </CardTitle>
                  <CardDescription>
                    Categories that create revenue streams for expense
                    allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "income")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-3 rounded-lg p-2"
                        >
                          <div
                            className={`h-4 w-4 rounded-full ${category.color}`}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-rose-400">
                    Expense Categories
                  </CardTitle>
                  <CardDescription>
                    Categories for expenses that get allocated to revenue
                    streams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "expense")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-3 rounded-lg p-2"
                        >
                          <div
                            className={`h-4 w-4 rounded-full ${category.color}`}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
                placeholder={selectedLoanForPayment?.monthlyPayment.toFixed(2)}
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
            <Button onClick={handleLoanPayment} className="glass-card border-0">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
