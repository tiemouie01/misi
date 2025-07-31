// Financial Management Schema for MISI
// Multi-user financial management system
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
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "login",
  "logout",
  "transaction_created",
  "transaction_updated",
  "transaction_deleted",
  "category_created",
  "category_updated",
  "category_deleted",
  "loan_created",
  "loan_updated",
  "loan_deleted",
  "loan_payment_created",
  "template_created",
  "template_deleted",
  "profile_updated",
]);

// Users table - Core user information
export const users = createTable(
  "user",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    email: d.varchar({ length: 255 }).notNull(),
    name: d.varchar({ length: 255 }).notNull(),
    role: userRoleEnum().default("user").notNull(),
    lastLoginAt: d.timestamp("last_login_at", { withTimezone: true }),
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
    uniqueIndex("user_email_unique").on(t.email),
    index("user_email_idx").on(t.email),
    index("user_role_idx").on(t.role),
  ],
);

// Categories table - Financial categories for income and expenses (per user)
export const categories = createTable(
  "category",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
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
    index("category_user_id_idx").on(t.userId),
    index("category_name_idx").on(t.name),
    index("category_type_idx").on(t.type),
    uniqueIndex("category_name_type_user_unique").on(t.name, t.type, t.userId),
  ],
);

// Transactions table - Individual financial transactions (per user)
export const transactions = createTable(
  "transaction",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
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
    index("transaction_user_id_idx").on(t.userId),
    index("transaction_type_idx").on(t.type),
    index("transaction_date_idx").on(t.date),
    index("transaction_category_idx").on(t.categoryName),
    index("transaction_revenue_stream_idx").on(t.revenueStream),
    index("transaction_user_date_idx").on(t.userId, t.date),
  ],
);

// Transaction Templates table - Reusable templates for common transactions (per user)
export const transactionTemplates = createTable(
  "transaction_template",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
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
    index("template_user_id_idx").on(t.userId),
    index("template_type_idx").on(t.type),
    index("template_category_idx").on(t.categoryName),
  ],
);

// Loans table - Borrowed and lent money with payment schedules (per user)
export const loans = createTable(
  "loan",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
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
    index("loan_user_id_idx").on(t.userId),
    index("loan_type_idx").on(t.type),
    index("loan_next_payment_idx").on(t.nextPaymentDate),
    index("loan_revenue_stream_idx").on(t.revenueStreamAllocation),
    index("loan_category_idx").on(t.categoryName),
    index("loan_user_payment_date_idx").on(t.userId, t.nextPaymentDate),
  ],
);

// Loan Payments table - Individual loan payment records (per user)
export const loanPayments = createTable(
  "loan_payment",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
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
    index("loan_payment_user_id_idx").on(t.userId),
    index("loan_payment_loan_id_idx").on(t.loanId),
    index("loan_payment_date_idx").on(t.date),
    index("loan_payment_revenue_stream_idx").on(t.revenueStream),
    index("loan_payment_user_date_idx").on(t.userId, t.date),
  ],
);

// User Sessions table - Track active user sessions
export const userSessions = createTable(
  "user_session",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
    sessionToken: d.varchar("session_token", { length: 255 }).notNull(),
    ipAddress: d.varchar("ip_address", { length: 45 }), // IPv6 compatible
    userAgent: d.text("user_agent"),
    expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
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
    index("session_user_id_idx").on(t.userId),
    index("session_token_idx").on(t.sessionToken),
    index("session_expires_idx").on(t.expiresAt),
  ],
);

// Activity Logs table - Track all user actions for audit and analytics
export const activityLogs = createTable(
  "activity_log",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    userId: d.varchar("user_id", { length: 255 }).notNull(),
    activityType: d.varchar("activity_type", { length: 255 }).notNull(),
    entityType: d.varchar("entity_type", { length: 255 }), // transaction, loan, category, etc.
    entityId: d.varchar("entity_id", { length: 255 }), // ID of the affected entity
    description: d.text().notNull(),
    metadata: d.jsonb(), // Additional context data
    ipAddress: d.varchar("ip_address", { length: 45 }),
    userAgent: d.text("user_agent"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("activity_user_id_idx").on(t.userId),
    index("activity_type_idx").on(t.activityType),
    index("activity_entity_idx").on(t.entityType, t.entityId),
    index("activity_created_idx").on(t.createdAt),
    index("activity_user_date_idx").on(t.userId, t.createdAt),
  ],
);

// Usage Statistics table - Aggregated statistics for analytics
export const usageStatistics = createTable(
  "usage_statistic",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    date: d.date().notNull(), // Date for the statistics (daily aggregation)
    activeUsers: d.integer("active_users").default(0).notNull(),
    newUsers: d.integer("new_users").default(0).notNull(),
    totalLogins: d.integer("total_logins").default(0).notNull(),
    transactionsCreated: d.integer("transactions_created").default(0).notNull(),
    loansCreated: d.integer("loans_created").default(0).notNull(),
    categoriesCreated: d.integer("categories_created").default(0).notNull(),
    templatesCreated: d.integer("templates_created").default(0).notNull(),
    totalRevenue: d
      .numeric("total_revenue", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalExpenses: d
      .numeric("total_expenses", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
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
    uniqueIndex("usage_date_unique").on(t.date),
    index("usage_date_idx").on(t.date),
    index("usage_active_users_idx").on(t.activeUsers),
  ],
);

// System Settings table - Global application settings
export const systemSettings = createTable(
  "system_setting",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    key: d.varchar({ length: 255 }).notNull(),
    value: d.text().notNull(),
    description: d.text(),
    isPublic: d.boolean("is_public").default(false).notNull(), // Whether setting is visible to non-admin users
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
    uniqueIndex("setting_key_unique").on(t.key),
    index("setting_key_idx").on(t.key),
    index("setting_public_idx").on(t.isPublic),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  transactions: many(transactions),
  transactionTemplates: many(transactionTemplates),
  loans: many(loans),
  loanPayments: many(loanPayments),
  sessions: many(userSessions),
  activityLogs: many(activityLogs),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  transactionTemplates: many(transactionTemplates),
  loans: many(loans),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryName, transactions.userId],
    references: [categories.name, categories.userId],
  }),
}));

export const transactionTemplatesRelations = relations(
  transactionTemplates,
  ({ one }) => ({
    user: one(users, {
      fields: [transactionTemplates.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [transactionTemplates.categoryName, transactionTemplates.userId],
      references: [categories.name, categories.userId],
    }),
  }),
);

export const loansRelations = relations(loans, ({ one, many }) => ({
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [loans.categoryName, loans.userId],
    references: [categories.name, categories.userId],
  }),
  payments: many(loanPayments),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  user: one(users, {
    fields: [loanPayments.userId],
    references: [users.id],
  }),
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
}));

// Type inference helpers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type UsageStatistic = typeof usageStatistics.$inferSelect;
export type NewUsageStatistic = typeof usageStatistics.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
