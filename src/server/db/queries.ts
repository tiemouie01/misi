"use server";

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
} from "./schema";

// Categories queries
export const getCategories = async (userId: string) => {
  try {
    const data = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.name);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getCategoriesByType = async (
  userId: string,
  type: "income" | "expense",
) => {
  try {
    const data = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.type, type)))
      .orderBy(categories.name);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Transactions queries
export const getTransactions = async (userId: string) => {
  try {
    const data = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getRecentTransactions = async (userId: string, limit = 5) => {
  try {
    const data = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getTransactionsByType = async (
  userId: string,
  type: "income" | "expense",
) => {
  try {
    const data = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
      .orderBy(desc(transactions.date));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getTransactionsByRevenueStream = async (
  userId: string,
  revenueStream: string,
) => {
  try {
    const data = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.revenueStream, revenueStream),
        ),
      )
      .orderBy(desc(transactions.date));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Optimized query for revenue streams overview (totals only)
export const getRevenueStreamsOverview = async (userId: string) => {
  try {
    // Use aggregation with FILTER for conditional sums in a single query
    const incomeResult = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.type, "income")),
      );

    const expenseResult = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.type, "expense")),
      );

    // Count distinct income categories (revenue streams)
    const streamsResult = await db
      .selectDistinct({ categoryName: transactions.categoryName })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.type, "income")),
      );

    const totalIncome = Number(incomeResult[0]?.total ?? 0);
    const totalExpenses = Number(expenseResult[0]?.total ?? 0);
    const totalRemaining = totalIncome - totalExpenses;
    const totalStreams = streamsResult.length;

    return {
      data: {
        totalIncome,
        totalExpenses,
        totalRemaining,
        totalStreams,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Optimized query for revenue streams list with individual expenses
export const getRevenueStreamsList = async (userId: string) => {
  try {
    // Get all income categories for this user with revenue stream calculations
    const incomeCategoriesResult = await getCategoriesByType(userId, "income");
    if (incomeCategoriesResult.error) {
      return { data: null, error: incomeCategoriesResult.error };
    }
    const incomeCategories = incomeCategoriesResult.data ?? [];

    // Use a more efficient approach with parallel queries
    const revenueStreamsData = await Promise.all(
      incomeCategories.map(async (category) => {
        // Single query to get both income and expense totals for this stream
        const [incomeResult, expenseResult, expenseTransactions] =
          await Promise.all([
            db
              .select({ total: sum(transactions.amount) })
              .from(transactions)
              .where(
                and(
                  eq(transactions.userId, userId),
                  eq(transactions.type, "income"),
                  eq(transactions.categoryName, category.name),
                ),
              ),
            db
              .select({ total: sum(transactions.amount) })
              .from(transactions)
              .where(
                and(
                  eq(transactions.userId, userId),
                  eq(transactions.type, "expense"),
                  eq(transactions.revenueStream, category.name),
                ),
              ),
            db
              .select({
                id: transactions.id,
                description: transactions.description,
                amount: transactions.amount,
                date: transactions.date,
              })
              .from(transactions)
              .where(
                and(
                  eq(transactions.userId, userId),
                  eq(transactions.type, "expense"),
                  eq(transactions.revenueStream, category.name),
                ),
              )
              .orderBy(desc(transactions.date)),
          ]);

        const totalIncome = Number(incomeResult[0]?.total ?? 0);
        const allocatedExpenses = Number(expenseResult[0]?.total ?? 0);

        // Convert amounts for expenses
        const expenses = expenseTransactions.map((expense) => ({
          ...expense,
          amount: Number(expense.amount),
        }));

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
    const data = revenueStreamsData.filter(
      (stream) => stream.totalIncome > 0 || stream.allocatedExpenses > 0,
    );

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Legacy function - kept for backward compatibility, redirects to new optimized function
export const calculateRevenueStreams = async (userId: string) => {
  return getRevenueStreamsList(userId);
};

// Transaction Templates queries
export const getTransactionTemplates = async (userId: string) => {
  try {
    const data = await db
      .select()
      .from(transactionTemplates)
      .where(eq(transactionTemplates.userId, userId))
      .orderBy(transactionTemplates.description);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Loans queries
export const getLoans = async (userId: string) => {
  try {
    const data = await db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .orderBy(loans.name);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getLoansByType = async (
  userId: string,
  type: "borrowed" | "lent",
) => {
  try {
    const data = await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.type, type)))
      .orderBy(loans.name);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getLoanWithPayments = async (userId: string, loanId: string) => {
  try {
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

    const data = { loan: loan[0], payments };
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Loan Payments queries
export const getLoanPayments = async (userId: string, loanId?: string) => {
  try {
    const query = db.select().from(loanPayments);

    if (loanId) {
      const data = await query
        .where(
          and(eq(loanPayments.userId, userId), eq(loanPayments.loanId, loanId)),
        )
        .orderBy(desc(loanPayments.date));
      return { data, error: null };
    }

    const data = await query
      .where(eq(loanPayments.userId, userId))
      .orderBy(desc(loanPayments.date));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Financial summary calculations
export const getFinancialSummary = async (userId: string) => {
  try {
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

    const data = {
      totalIncome,
      totalExpenses,
      totalRemaining: totalIncome - totalExpenses,
      totalBorrowed,
      totalLent,
      monthlyPayments,
      activeLoans,
    };
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Loan counts by type (for loan summary)
export const getLoanCountsByType = async (userId: string) => {
  try {
    const borrowedCount = await db
      .select({ count: count() })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.type, "borrowed")));

    const lentCount = await db
      .select({ count: count() })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.type, "lent")));

    const data = {
      borrowedCount: borrowedCount[0]?.count ?? 0,
      lentCount: lentCount[0]?.count ?? 0,
    };
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Available revenue streams (for dropdowns)
export const getAvailableRevenueStreams = async (userId: string) => {
  try {
    // Get categories that have income transactions for this user
    const data = await db
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

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
