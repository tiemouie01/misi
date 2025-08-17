"use server";

// Database mutations for MISI Financial Management
// All create, update, delete operations

import { eq, and } from "drizzle-orm";
import { db } from "./index";
import {
  transactions,
  transactionTemplates,
  loans,
  loanPayments,
  type NewTransaction,
  type NewTransactionTemplate,
  type NewLoan,
  type NewLoanPayment,
} from "./schema";

// Transaction mutations
export const createTransaction = async (transaction: NewTransaction) => {
  try {
    const data = await db.insert(transactions).values(transaction).returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const updateTransaction = async (
  userId: string,
  id: string,
  transaction: Partial<NewTransaction>,
) => {
  try {
    const data = await db
      .update(transactions)
      .set(transaction)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const deleteTransaction = async (userId: string, id: string) => {
  try {
    const data = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Transaction Template mutations
export const createTransactionTemplate = async (
  template: typeof transactionTemplates.$inferInsert,
) => {
  try {
    const data = await db
      .insert(transactionTemplates)
      .values(template)
      .returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const updateTransactionTemplate = async (
  userId: string,
  id: string,
  template: Partial<NewTransactionTemplate>,
) => {
  try {
    const data = await db
      .update(transactionTemplates)
      .set(template)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, userId),
        ),
      )
      .returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const deleteTransactionTemplate = async (userId: string, id: string) => {
  try {
    const data = await db
      .delete(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.id, id),
          eq(transactionTemplates.userId, userId),
        ),
      );
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Loan mutations
export const createLoan = async (loan: NewLoan) => {
  try {
    const data = await db.insert(loans).values(loan).returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const updateLoan = async (
  userId: string,
  id: string,
  loan: Partial<NewLoan>,
) => {
  try {
    const data = await db
      .update(loans)
      .set(loan)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const deleteLoan = async (userId: string, id: string) => {
  try {
    // Delete associated payments first (user validation)
    await db
      .delete(loanPayments)
      .where(and(eq(loanPayments.loanId, id), eq(loanPayments.userId, userId)));
    // Then delete the loan (user validation)
    const data = await db
      .delete(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)));
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Loan Payment mutations
export const createLoanPayment = async (payment: NewLoanPayment) => {
  try {
    const data = await db.insert(loanPayments).values(payment).returning();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
