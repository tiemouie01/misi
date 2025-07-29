export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
  revenueStream?: string; // For expenses - which revenue stream they're allocated to
}

export interface TransactionTemplate {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  revenueStream?: string; // For expense templates
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export interface RevenueStream {
  name: string;
  totalIncome: number;
  allocatedExpenses: number;
  remaining: number;
  color: string;
  expenses: Transaction[];
}

export interface Loan {
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

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  date: Date;
  revenueStream?: string;
}

export const defaultIncomeCategories: Category[] = [
  { id: "1", name: "Salary", type: "income", color: "bg-emerald-400" },
  { id: "2", name: "Freelance", type: "income", color: "bg-cyan-400" },
  { id: "3", name: "Business", type: "income", color: "bg-blue-400" },
  { id: "4", name: "Investments", type: "income", color: "bg-indigo-400" },
  { id: "5", name: "Other Income", type: "income", color: "bg-slate-400" },
];

export const defaultExpenseCategories: Category[] = [
  { id: "6", name: "Housing", type: "expense", color: "bg-rose-400" },
  { id: "7", name: "Transportation", type: "expense", color: "bg-orange-400" },
  { id: "8", name: "Food & Dining", type: "expense", color: "bg-pink-400" },
  { id: "9", name: "Utilities", type: "expense", color: "bg-purple-400" },
  { id: "10", name: "Healthcare", type: "expense", color: "bg-teal-400" },
  { id: "11", name: "Entertainment", type: "expense", color: "bg-cyan-400" },
  { id: "12", name: "Shopping", type: "expense", color: "bg-violet-400" },
  { id: "13", name: "Other Expenses", type: "expense", color: "bg-slate-400" },
];

export const defaultTemplates: TransactionTemplate[] = [
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
