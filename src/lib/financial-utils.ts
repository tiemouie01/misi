import {
  Transaction,
  Category,
  RevenueStream,
  Loan,
  LoanPayment,
  TransactionTemplate,
  defaultIncomeCategories,
  defaultExpenseCategories,
  defaultTemplates,
} from "./types";

// localStorage utilities
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;

    const parsed = JSON.parse(saved);

    // Handle Date objects for specific keys
    if (key === "financial-transactions") {
      return parsed.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      })) as T;
    }

    if (key === "financial-loans") {
      return parsed.map((l: any) => ({
        ...l,
        startDate: new Date(l.startDate),
        nextPaymentDate: new Date(l.nextPaymentDate),
      })) as T;
    }

    if (key === "financial-loan-payments") {
      return parsed.map((p: any) => ({
        ...p,
        date: new Date(p.date),
      })) as T;
    }

    return parsed as T;
  } catch (error) {
    console.error(`Error parsing ${key}:`, error);
    return defaultValue;
  }
};

export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

// Data initialization
export const initializeData = () => {
  const transactions = loadFromLocalStorage<Transaction[]>(
    "financial-transactions",
    [],
  );
  const templates = loadFromLocalStorage<TransactionTemplate[]>(
    "financial-templates",
    defaultTemplates,
  );
  const categories = loadFromLocalStorage<Category[]>("financial-categories", [
    ...defaultIncomeCategories,
    ...defaultExpenseCategories,
  ]);
  const loans = loadFromLocalStorage<Loan[]>("financial-loans", []);
  const loanPayments = loadFromLocalStorage<LoanPayment[]>(
    "financial-loan-payments",
    [],
  );

  return { transactions, templates, categories, loans, loanPayments };
};

// Revenue stream calculations
export const calculateRevenueStreams = (
  transactions: Transaction[],
  categories: Category[],
): RevenueStream[] => {
  return categories
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
};

// Financial calculations
export const calculateTotals = (revenueStreams: RevenueStream[]) => {
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

  return { totalIncome, totalExpenses, totalRemaining };
};

// Loan calculations
export const calculateMonthlyPayment = (
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

export const calculateLoanTotals = (loans: Loan[]) => {
  const totalBorrowed = loans
    .filter((l) => l.type === "borrowed")
    .reduce((sum, l) => sum + l.currentBalance, 0);

  const totalLent = loans
    .filter((l) => l.type === "lent")
    .reduce((sum, l) => sum + l.currentBalance, 0);

  const monthlyPayments = loans
    .filter((l) => l.type === "borrowed")
    .reduce((sum, l) => sum + l.monthlyPayment, 0);

  return { totalBorrowed, totalLent, monthlyPayments };
};

// Category utilities
export const getCategoryName = (categoryId: string, categories: Category[]) => {
  return categories.find((c) => c.name === categoryId)?.name || categoryId;
};

export const getCategoryColor = (
  categoryId: string,
  categories: Category[],
) => {
  return categories.find((c) => c.name === categoryId)?.color || "bg-slate-400";
};

export const getAvailableRevenueStreams = (
  transactions: Transaction[],
  categories: Category[],
) => {
  return categories
    .filter((c) => c.type === "income")
    .filter((c) =>
      transactions.some((t) => t.type === "income" && t.category === c.name),
    );
};

// Form validation helpers
export const validateTransaction = (
  type: "income" | "expense",
  amount: string,
  category: string,
  revenueStream?: string,
): boolean => {
  if (!amount || !category) return false;
  if (type === "expense" && !revenueStream) return false;
  return true;
};

export const validateLoan = (
  type: "borrowed" | "lent",
  name: string,
  principalAmount: string,
  interestRate: string,
  termMonths: string,
  revenueStream?: string,
): boolean => {
  if (!name || !principalAmount || !interestRate || !termMonths) return false;
  if (type === "borrowed" && !revenueStream) return false;
  return true;
};
