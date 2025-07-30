// Database seeder for MISI Financial Management System
// Populates the database with default categories and transaction templates

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  categories,
  transactionTemplates,
  type NewCategory,
  type NewTransactionTemplate,
} from "./schema";
import { env } from "~/env";

// Default income categories
const defaultIncomeCategories: NewCategory[] = [
  { id: "1", name: "Salary", type: "income", color: "bg-emerald-400" },
  { id: "2", name: "Freelance", type: "income", color: "bg-cyan-400" },
  { id: "3", name: "Business", type: "income", color: "bg-blue-400" },
  { id: "4", name: "Investments", type: "income", color: "bg-indigo-400" },
  { id: "5", name: "Other Income", type: "income", color: "bg-slate-400" },
];

// Default expense categories
const defaultExpenseCategories: NewCategory[] = [
  { id: "6", name: "Housing", type: "expense", color: "bg-rose-400" },
  { id: "7", name: "Transportation", type: "expense", color: "bg-orange-400" },
  { id: "8", name: "Food & Dining", type: "expense", color: "bg-pink-400" },
  { id: "9", name: "Utilities", type: "expense", color: "bg-purple-400" },
  { id: "10", name: "Healthcare", type: "expense", color: "bg-teal-400" },
  { id: "11", name: "Entertainment", type: "expense", color: "bg-cyan-400" },
  { id: "12", name: "Shopping", type: "expense", color: "bg-violet-400" },
  { id: "13", name: "Other Expenses", type: "expense", color: "bg-slate-400" },
];

// Default transaction templates
const defaultTemplates: NewTransactionTemplate[] = [
  {
    id: "t1",
    type: "expense",
    amount: "4.50",
    categoryName: "Food & Dining",
    description: "Coffee",
    revenueStream: "Salary",
  },
  {
    id: "t2",
    type: "expense",
    amount: "45.00",
    categoryName: "Transportation",
    description: "Gas Fill-up",
    revenueStream: "Salary",
  },
  {
    id: "t3",
    type: "expense",
    amount: "120.00",
    categoryName: "Food & Dining",
    description: "Groceries",
    revenueStream: "Salary",
  },
  {
    id: "t4",
    type: "expense",
    amount: "12.00",
    categoryName: "Food & Dining",
    description: "Lunch",
    revenueStream: "Freelance",
  },
  {
    id: "t5",
    type: "expense",
    amount: "25.00",
    categoryName: "Entertainment",
    description: "Movie Ticket",
    revenueStream: "Freelance",
  },
];

async function seed() {
  // Initialize database connection
  const connection = postgres(env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    console.log("🌱 Starting database seed...");

    // Insert default categories
    console.log("📂 Seeding categories...");
    await db
      .insert(categories)
      .values([...defaultIncomeCategories, ...defaultExpenseCategories])
      .onConflictDoNothing();

    // Insert default transaction templates
    console.log("📝 Seeding transaction templates...");
    await db
      .insert(transactionTemplates)
      .values(defaultTemplates)
      .onConflictDoNothing();

    console.log("✅ Database seeded successfully!");

    // Log summary
    console.log(`
📊 Seeding Summary:
   - Income Categories: ${defaultIncomeCategories.length}
   - Expense Categories: ${defaultExpenseCategories.length}
   - Transaction Templates: ${defaultTemplates.length}
    `);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("🏁 Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed failed:", error);
      process.exit(1);
    });
}

export { seed };
