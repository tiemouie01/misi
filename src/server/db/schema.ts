// Financial Management Schema for MISI
// Based on the TypeScript interfaces from src/lib/types.ts

import { relations, sql } from "drizzle-orm";
import {
  pgTableCreator,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Multi-project schema feature - prefixes all table names with 'misi_'
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `misi_${name}`);

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);
export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);
export const loanTypeEnum = pgEnum("loan_type", ["borrowed", "lent"]);

// Categories table - Financial categories for income and expenses
export const categories = createTable(
  "category",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    name: d.varchar({ length: 255 }).notNull(),
    type: categoryTypeEnum().notNull(),
    color: d.varchar({ length: 255 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("category_name_idx").on(t.name),
    index("category_type_idx").on(t.type),
    uniqueIndex("category_name_type_unique").on(t.name, t.type),
  ],
);

// Transactions table - Individual financial transactions
export const transactions = createTable(
  "transaction",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    type: transactionTypeEnum().notNull(),
    amount: d.numeric({ precision: 12, scale: 2 }).notNull(),
    categoryName: d.varchar("category_name", { length: 255 }).notNull(),
    description: d.text().notNull(),
    date: d.timestamp({ withTimezone: true }).notNull(),
    revenueStream: d.varchar("revenue_stream", { length: 255 }), // For expenses - which revenue stream they're allocated to
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("transaction_type_idx").on(t.type),
    index("transaction_date_idx").on(t.date),
    index("transaction_category_idx").on(t.categoryName),
    index("transaction_revenue_stream_idx").on(t.revenueStream),
  ],
);

// Transaction Templates table - Reusable templates for common transactions
export const transactionTemplates = createTable(
  "transaction_template",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    type: transactionTypeEnum().notNull(),
    amount: d.numeric({ precision: 12, scale: 2 }).notNull(),
    categoryName: d.varchar("category_name", { length: 255 }).notNull(),
    description: d.text().notNull(),
    revenueStream: d.varchar("revenue_stream", { length: 255 }), // For expense templates
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("template_type_idx").on(t.type),
    index("template_category_idx").on(t.categoryName),
  ],
);

// Loans table - Borrowed and lent money with payment schedules
export const loans = createTable(
  "loan",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    type: loanTypeEnum().notNull(),
    name: d.varchar({ length: 255 }).notNull(),
    principalAmount: d
      .numeric("principal_amount", { precision: 12, scale: 2 })
      .notNull(),
    currentBalance: d
      .numeric("current_balance", { precision: 12, scale: 2 })
      .notNull(),
    interestRate: d
      .numeric("interest_rate", { precision: 5, scale: 2 })
      .notNull(),
    termMonths: d.integer("term_months").notNull(),
    monthlyPayment: d
      .numeric("monthly_payment", { precision: 12, scale: 2 })
      .notNull(),
    startDate: d.timestamp("start_date", { withTimezone: true }).notNull(),
    nextPaymentDate: d
      .timestamp("next_payment_date", { withTimezone: true })
      .notNull(),
    revenueStreamAllocation: d.varchar("revenue_stream_allocation", {
      length: 255,
    }), // For borrowed loans - which stream pays for it
    categoryName: d.varchar("category_name", { length: 255 }).notNull(),
    description: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("loan_type_idx").on(t.type),
    index("loan_next_payment_idx").on(t.nextPaymentDate),
    index("loan_revenue_stream_idx").on(t.revenueStreamAllocation),
    index("loan_category_idx").on(t.categoryName),
  ],
);

// Loan Payments table - Individual loan payment records
export const loanPayments = createTable(
  "loan_payment",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    loanId: d.varchar("loan_id", { length: 255 }).notNull(),
    amount: d.numeric({ precision: 12, scale: 2 }).notNull(),
    principalAmount: d
      .numeric("principal_amount", { precision: 12, scale: 2 })
      .notNull(),
    interestAmount: d
      .numeric("interest_amount", { precision: 12, scale: 2 })
      .notNull(),
    date: d.timestamp({ withTimezone: true }).notNull(),
    revenueStream: d.varchar("revenue_stream", { length: 255 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("loan_payment_loan_id_idx").on(t.loanId),
    index("loan_payment_date_idx").on(t.date),
    index("loan_payment_revenue_stream_idx").on(t.revenueStream),
  ],
);

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  transactionTemplates: many(transactionTemplates),
  loans: many(loans),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryName],
    references: [categories.name],
  }),
}));

export const transactionTemplatesRelations = relations(
  transactionTemplates,
  ({ one }) => ({
    category: one(categories, {
      fields: [transactionTemplates.categoryName],
      references: [categories.name],
    }),
  }),
);

export const loansRelations = relations(loans, ({ one, many }) => ({
  category: one(categories, {
    fields: [loans.categoryName],
    references: [categories.name],
  }),
  payments: many(loanPayments),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
}));

// Type inference helpers
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionTemplate = typeof transactionTemplates.$inferSelect;
export type NewTransactionTemplate = typeof transactionTemplates.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type LoanPayment = typeof loanPayments.$inferSelect;
export type NewLoanPayment = typeof loanPayments.$inferInsert;
