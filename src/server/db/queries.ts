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
export const getCategories = async (userId: string) => {
  return await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.name);
};

export const getCategoriesByType = async (
  userId: string,
  type: "income" | "expense",
) => {
  return await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, type)))
    .orderBy(categories.name);
};

// Transactions queries
export const getTransactions = async (userId: string) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date));
};

export const getRecentTransactions = async (userId: string, limit = 5) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date))
    .limit(limit);
};

export const getTransactionsByType = async (
  userId: string,
  type: "income" | "expense",
) => {
  return await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
    .orderBy(desc(transactions.date));
};

export const getTransactionsByRevenueStream = async (
  userId: string,
  revenueStream: string,
) => {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.revenueStream, revenueStream),
      ),
    )
    .orderBy(desc(transactions.date));
};

export const createTransaction = async (transaction: NewTransaction) => {
  return await db.insert(transactions).values(transaction).returning();
};

export const updateTransaction = async (
  userId: string,
  id: string,
  transaction: Partial<NewTransaction>,
) => {
  return await db
    .update(transactions)
    .set(transaction)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
};

export const deleteTransaction = async (userId: string, id: string) => {
  return await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
};

// Revenue stream calculations (replaces calculateRevenueStreams from financial-utils.ts)
export const calculateRevenueStreams = async (userId: string) => {
  // Get all income categories for this user
  const incomeCategories = await getCategoriesByType(userId, "income");

  const revenueStreams = await Promise.all(
    incomeCategories.map(async (category) => {
      // Calculate total income for this category
      const incomeResult = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
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
            eq(transactions.userId, userId),
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
            eq(transactions.userId, userId),
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
export const getTransactionTemplates = async (userId: string) => {
  return await db
    .select()
    .from(transactionTemplates)
    .where(eq(transactionTemplates.userId, userId))
    .orderBy(transactionTemplates.description);
};

export const createTransactionTemplate = async (
  template: typeof transactionTemplates.$inferInsert,
) => {
  return await db.insert(transactionTemplates).values(template).returning();
};

export const deleteTransactionTemplate = async (userId: string, id: string) => {
  return await db
    .delete(transactionTemplates)
    .where(
      and(
        eq(transactionTemplates.id, id),
        eq(transactionTemplates.userId, userId),
      ),
    );
};

// Loans queries
export const getLoans = async (userId: string) => {
  return await db
    .select()
    .from(loans)
    .where(eq(loans.userId, userId))
    .orderBy(loans.name);
};

export const getLoansByType = async (
  userId: string,
  type: "borrowed" | "lent",
) => {
  return await db
    .select()
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.type, type)))
    .orderBy(loans.name);
};

export const getLoanWithPayments = async (userId: string, loanId: string) => {
  const loan = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)));
  const payments = await db
    .select()
    .from(loanPayments)
    .where(
      and(eq(loanPayments.loanId, loanId), eq(loanPayments.userId, userId)),
    )
    .orderBy(desc(loanPayments.date));

  return { loan: loan[0], payments };
};

export const createLoan = async (loan: NewLoan) => {
  return await db.insert(loans).values(loan).returning();
};

export const updateLoan = async (
  userId: string,
  id: string,
  loan: Partial<NewLoan>,
) => {
  return await db
    .update(loans)
    .set(loan)
    .where(and(eq(loans.id, id), eq(loans.userId, userId)))
    .returning();
};

export const deleteLoan = async (userId: string, id: string) => {
  // Delete associated payments first (user validation)
  await db
    .delete(loanPayments)
    .where(and(eq(loanPayments.loanId, id), eq(loanPayments.userId, userId)));
  // Then delete the loan (user validation)
  return await db
    .delete(loans)
    .where(and(eq(loans.id, id), eq(loans.userId, userId)));
};

// Loan Payments queries
export const getLoanPayments = async (userId: string, loanId?: string) => {
  const query = db.select().from(loanPayments);

  if (loanId) {
    return await query
      .where(
        and(eq(loanPayments.userId, userId), eq(loanPayments.loanId, loanId)),
      )
      .orderBy(desc(loanPayments.date));
  }

  return await query
    .where(eq(loanPayments.userId, userId))
    .orderBy(desc(loanPayments.date));
};

export const createLoanPayment = async (payment: NewLoanPayment) => {
  return await db.insert(loanPayments).values(payment).returning();
};

// Financial summary calculations
export const getFinancialSummary = async (userId: string) => {
  // Total income
  const incomeResult = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "income")),
    );

  // Total expenses
  const expenseResult = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "expense")),
    );

  // Loan totals
  const borrowedResult = await db
    .select({ total: sum(loans.currentBalance) })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.type, "borrowed")));

  const lentResult = await db
    .select({ total: sum(loans.currentBalance) })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.type, "lent")));

  const monthlyPaymentsResult = await db
    .select({ total: sum(loans.monthlyPayment) })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.type, "borrowed")));

  // Active loans count
  const activeLoanCount = await db
    .select({ count: count() })
    .from(loans)
    .where(eq(loans.userId, userId));

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
export const getAvailableRevenueStreams = async (userId: string) => {
  // Get categories that have income transactions for this user
  const result = await db
    .selectDistinct({
      id: categories.id,
      name: categories.name,
      color: categories.color,
    })
    .from(categories)
    .innerJoin(
      transactions,
      and(
        eq(categories.name, transactions.categoryName),
        eq(categories.userId, transactions.userId),
      ),
    )
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.type, "income"),
        eq(transactions.type, "income"),
      ),
    )
    .orderBy(categories.name);

  return result;
};
