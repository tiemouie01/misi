// Database queries for MISI Financial Management
// Examples of how to replace localStorage with database operations

import { desc, eq, and, sum, count } from "drizzle-orm";
import { db } from "./index";
import {
  categories,
  transactions,
  transactionTemplates,
  loans,
  loanPayments,
  type NewTransaction,
  type NewLoan,
  type NewLoanPayment,
} from "./schema";

// Categories queries
export const getCategories = async () => {
  return await db.select().from(categories).orderBy(categories.name);
};

export const getCategoriesByType = async (type: "income" | "expense") => {
  return await db
    .select()
    .from(categories)
    .where(eq(categories.type, type))
    .orderBy(categories.name);
};

// Transactions queries
export const getTransactions = async () => {
  return await db.select().from(transactions).orderBy(desc(transactions.date));
};

export const getRecentTransactions = async (limit = 5) => {
  return await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date))
    .limit(limit);
};

export const getTransactionsByType = async (type: "income" | "expense") => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.type, type))
    .orderBy(desc(transactions.date));
};

export const getTransactionsByRevenueStream = async (revenueStream: string) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.revenueStream, revenueStream))
    .orderBy(desc(transactions.date));
};

export const createTransaction = async (transaction: NewTransaction) => {
  return await db.insert(transactions).values(transaction).returning();
};

export const updateTransaction = async (
  id: string,
  transaction: Partial<NewTransaction>,
) => {
  return await db
    .update(transactions)
    .set(transaction)
    .where(eq(transactions.id, id))
    .returning();
};

export const deleteTransaction = async (id: string) => {
  return await db.delete(transactions).where(eq(transactions.id, id));
};

// Revenue stream calculations (replaces calculateRevenueStreams from financial-utils.ts)
export const calculateRevenueStreams = async () => {
  // Get all income categories
  const incomeCategories = await getCategoriesByType("income");

  const revenueStreams = await Promise.all(
    incomeCategories.map(async (category) => {
      // Calculate total income for this category
      const incomeResult = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "income"),
            eq(transactions.categoryName, category.name),
          ),
        );

      // Calculate allocated expenses for this revenue stream
      const expenseResult = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            eq(transactions.revenueStream, category.name),
          ),
        );

      // Get expense transactions for this stream
      const expenses = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            eq(transactions.revenueStream, category.name),
          ),
        )
        .orderBy(desc(transactions.date));

      const totalIncome = Number(incomeResult[0]?.total ?? 0);
      const allocatedExpenses = Number(expenseResult[0]?.total ?? 0);

      return {
        name: category.name,
        totalIncome,
        allocatedExpenses,
        remaining: totalIncome - allocatedExpenses,
        color: category.color,
        expenses,
      };
    }),
  );

  // Filter to only include streams with activity
  return revenueStreams.filter(
    (stream) => stream.totalIncome > 0 || stream.allocatedExpenses > 0,
  );
};

// Transaction Templates queries
export const getTransactionTemplates = async () => {
  return await db
    .select()
    .from(transactionTemplates)
    .orderBy(transactionTemplates.description);
};

export const createTransactionTemplate = async (
  template: typeof transactionTemplates.$inferInsert,
) => {
  return await db.insert(transactionTemplates).values(template).returning();
};

export const deleteTransactionTemplate = async (id: string) => {
  return await db
    .delete(transactionTemplates)
    .where(eq(transactionTemplates.id, id));
};

// Loans queries
export const getLoans = async () => {
  return await db.select().from(loans).orderBy(loans.name);
};

export const getLoansByType = async (type: "borrowed" | "lent") => {
  return await db
    .select()
    .from(loans)
    .where(eq(loans.type, type))
    .orderBy(loans.name);
};

export const getLoanWithPayments = async (loanId: string) => {
  const loan = await db.select().from(loans).where(eq(loans.id, loanId));
  const payments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loanId, loanId))
    .orderBy(desc(loanPayments.date));

  return { loan: loan[0], payments };
};

export const createLoan = async (loan: NewLoan) => {
  return await db.insert(loans).values(loan).returning();
};

export const updateLoan = async (id: string, loan: Partial<NewLoan>) => {
  return await db.update(loans).set(loan).where(eq(loans.id, id)).returning();
};

export const deleteLoan = async (id: string) => {
  // Delete associated payments first
  await db.delete(loanPayments).where(eq(loanPayments.loanId, id));
  // Then delete the loan
  return await db.delete(loans).where(eq(loans.id, id));
};

// Loan Payments queries
export const getLoanPayments = async (loanId?: string) => {
  const query = db.select().from(loanPayments);

  if (loanId) {
    return await query
      .where(eq(loanPayments.loanId, loanId))
      .orderBy(desc(loanPayments.date));
  }

  return await query.orderBy(desc(loanPayments.date));
};

export const createLoanPayment = async (payment: NewLoanPayment) => {
  return await db.insert(loanPayments).values(payment).returning();
};

// Financial summary calculations
export const getFinancialSummary = async () => {
  // Total income
  const incomeResult = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.type, "income"));

  // Total expenses
  const expenseResult = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.type, "expense"));

  // Loan totals
  const borrowedResult = await db
    .select({ total: sum(loans.currentBalance) })
    .from(loans)
    .where(eq(loans.type, "borrowed"));

  const lentResult = await db
    .select({ total: sum(loans.currentBalance) })
    .from(loans)
    .where(eq(loans.type, "lent"));

  const monthlyPaymentsResult = await db
    .select({ total: sum(loans.monthlyPayment) })
    .from(loans)
    .where(eq(loans.type, "borrowed"));

  // Active loans count
  const activeLoanCount = await db.select({ count: count() }).from(loans);

  const totalIncome = Number(incomeResult[0]?.total ?? 0);
  const totalExpenses = Number(expenseResult[0]?.total ?? 0);
  const totalBorrowed = Number(borrowedResult[0]?.total ?? 0);
  const totalLent = Number(lentResult[0]?.total ?? 0);
  const monthlyPayments = Number(monthlyPaymentsResult[0]?.total ?? 0);
  const activeLoans = activeLoanCount[0]?.count ?? 0;

  return {
    totalIncome,
    totalExpenses,
    totalRemaining: totalIncome - totalExpenses,
    totalBorrowed,
    totalLent,
    monthlyPayments,
    activeLoans,
  };
};

// Available revenue streams (for dropdowns)
export const getAvailableRevenueStreams = async () => {
  // Get categories that have income transactions
  const result = await db
    .selectDistinct({
      id: categories.id,
      name: categories.name,
      color: categories.color,
    })
    .from(categories)
    .innerJoin(transactions, eq(categories.name, transactions.categoryName))
    .where(and(eq(categories.type, "income"), eq(transactions.type, "income")))
    .orderBy(categories.name);

  return result;
};
