// Database seeder for MISI Financial Management System
// Populates the database with comprehensive dummy data in Malawi Kwacha (MWK)

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  categories,
  transactions,
  transactionTemplates,
  loans,
  loanPayments,
  type NewCategory,
  type NewTransaction,
  type NewTransactionTemplate,
  type NewLoan,
  type NewLoanPayment,
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

// Default transaction templates (amounts in MWK)
const defaultTemplates: NewTransactionTemplate[] = [
  {
    id: "t1",
    type: "expense",
    amount: "7650.00",
    categoryName: "Food & Dining",
    description: "Coffee at café",
    revenueStream: "Salary",
  },
  {
    id: "t2",
    type: "expense",
    amount: "76500.00",
    categoryName: "Transportation",
    description: "Fuel fill-up",
    revenueStream: "Salary",
  },
  {
    id: "t3",
    type: "expense",
    amount: "204000.00",
    categoryName: "Food & Dining",
    description: "Monthly groceries",
    revenueStream: "Salary",
  },
  {
    id: "t4",
    type: "expense",
    amount: "20400.00",
    categoryName: "Food & Dining",
    description: "Lunch at restaurant",
    revenueStream: "Freelance",
  },
  {
    id: "t5",
    type: "expense",
    amount: "42500.00",
    categoryName: "Entertainment",
    description: "Cinema ticket",
    revenueStream: "Freelance",
  },
  {
    id: "t6",
    type: "expense",
    amount: "85000.00",
    categoryName: "Utilities",
    description: "Electricity bill",
    revenueStream: "Salary",
  },
  {
    id: "t7",
    type: "expense",
    amount: "34000.00",
    categoryName: "Transportation",
    description: "Minibus transport",
    revenueStream: "Salary",
  },
];

// Dummy transactions (amounts in MWK)
const dummyTransactions: NewTransaction[] = [
  // Income transactions
  {
    id: "txn1",
    type: "income",
    amount: "450000.00",
    categoryName: "Salary",
    description: "Monthly salary - December 2024",
    date: new Date("2024-12-01"),
  },
  {
    id: "txn2",
    type: "income",
    amount: "180000.00",
    categoryName: "Freelance",
    description: "Website development project",
    date: new Date("2024-12-05"),
  },
  {
    id: "txn3",
    type: "income",
    amount: "75000.00",
    categoryName: "Business",
    description: "Online shop sales",
    date: new Date("2024-12-10"),
  },
  {
    id: "txn4",
    type: "income",
    amount: "25000.00",
    categoryName: "Investments",
    description: "Dividend from shares",
    date: new Date("2024-12-15"),
  },

  // Expense transactions
  {
    id: "txn5",
    type: "expense",
    amount: "180000.00",
    categoryName: "Housing",
    description: "Monthly rent",
    date: new Date("2024-12-01"),
    revenueStream: "Salary",
  },
  {
    id: "txn6",
    type: "expense",
    amount: "85000.00",
    categoryName: "Utilities",
    description: "Electricity and water",
    date: new Date("2024-12-02"),
    revenueStream: "Salary",
  },
  {
    id: "txn7",
    type: "expense",
    amount: "204000.00",
    categoryName: "Food & Dining",
    description: "Monthly groceries",
    date: new Date("2024-12-03"),
    revenueStream: "Salary",
  },
  {
    id: "txn8",
    type: "expense",
    amount: "76500.00",
    categoryName: "Transportation",
    description: "Fuel for the month",
    date: new Date("2024-12-04"),
    revenueStream: "Salary",
  },
  {
    id: "txn9",
    type: "expense",
    amount: "65000.00",
    categoryName: "Healthcare",
    description: "Medical checkup",
    date: new Date("2024-12-08"),
    revenueStream: "Freelance",
  },
  {
    id: "txn10",
    type: "expense",
    amount: "42500.00",
    categoryName: "Entertainment",
    description: "Weekend outing",
    date: new Date("2024-12-14"),
    revenueStream: "Business",
  },
  {
    id: "txn11",
    type: "expense",
    amount: "95000.00",
    categoryName: "Shopping",
    description: "Clothing and accessories",
    date: new Date("2024-12-16"),
    revenueStream: "Freelance",
  },
  {
    id: "txn12",
    type: "expense",
    amount: "34000.00",
    categoryName: "Transportation",
    description: "Public transport",
    date: new Date("2024-12-18"),
    revenueStream: "Salary",
  },
];

// Dummy loans (amounts in MWK)
const dummyLoans: NewLoan[] = [
  {
    id: "loan1",
    type: "borrowed",
    name: "Motorcycle Loan",
    principalAmount: "2550000.00", // ~$1,500
    currentBalance: "2125000.00",
    interestRate: "18.50",
    termMonths: 36,
    monthlyPayment: "89250.00",
    startDate: new Date("2024-06-01"),
    nextPaymentDate: new Date("2025-01-01"),
    revenueStreamAllocation: "Salary",
    categoryName: "Transportation",
    description: "Honda motorcycle for daily transport",
  },
  {
    id: "loan2",
    type: "borrowed",
    name: "Business Equipment Loan",
    principalAmount: "850000.00", // ~$500
    currentBalance: "680000.00",
    interestRate: "22.00",
    termMonths: 24,
    monthlyPayment: "45900.00",
    startDate: new Date("2024-08-01"),
    nextPaymentDate: new Date("2025-01-01"),
    revenueStreamAllocation: "Business",
    categoryName: "Business",
    description: "Equipment for tailoring business",
  },
  {
    id: "loan3",
    type: "lent",
    name: "Friend's Emergency Loan",
    principalAmount: "170000.00", // ~$100
    currentBalance: "85000.00",
    interestRate: "5.00",
    termMonths: 12,
    monthlyPayment: "15300.00",
    startDate: new Date("2024-09-01"),
    nextPaymentDate: new Date("2025-01-01"),
    categoryName: "Other Expenses",
    description: "Emergency loan to close friend",
  },
  {
    id: "loan4",
    type: "borrowed",
    name: "Education Loan",
    principalAmount: "1700000.00", // ~$1,000
    currentBalance: "1530000.00",
    interestRate: "15.00",
    termMonths: 48,
    monthlyPayment: "45900.00",
    startDate: new Date("2024-01-01"),
    nextPaymentDate: new Date("2025-01-01"),
    revenueStreamAllocation: "Freelance",
    categoryName: "Other Expenses",
    description: "University tuition financing",
  },
];

// Dummy loan payments (amounts in MWK)
const dummyLoanPayments: NewLoanPayment[] = [
  {
    id: "payment1",
    loanId: "loan1",
    amount: "89250.00",
    principalAmount: "65000.00",
    interestAmount: "24250.00",
    date: new Date("2024-12-01"),
    revenueStream: "Salary",
  },
  {
    id: "payment2",
    loanId: "loan2",
    amount: "45900.00",
    principalAmount: "30600.00",
    interestAmount: "15300.00",
    date: new Date("2024-12-01"),
    revenueStream: "Business",
  },
  {
    id: "payment3",
    loanId: "loan4",
    amount: "45900.00",
    principalAmount: "36720.00",
    interestAmount: "9180.00",
    date: new Date("2024-12-01"),
    revenueStream: "Freelance",
  },
  {
    id: "payment4",
    loanId: "loan1",
    amount: "89250.00",
    principalAmount: "66300.00",
    interestAmount: "22950.00",
    date: new Date("2024-11-01"),
    revenueStream: "Salary",
  },
  {
    id: "payment5",
    loanId: "loan2",
    amount: "45900.00",
    principalAmount: "31200.00",
    interestAmount: "14700.00",
    date: new Date("2024-11-01"),
    revenueStream: "Business",
  },
];

// Helper function to clear all data
async function clearDatabase(db: ReturnType<typeof drizzle>) {
  console.log("🗑️  Clearing existing data...");

  // Delete in reverse dependency order to avoid foreign key constraints
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(loanPayments);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(loans);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(transactionTemplates);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(transactions);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(categories);

  console.log("✨ Database cleared successfully!");
}

async function seed() {
  // Initialize database connection
  const connection = postgres(env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    console.log(
      "🌱 Starting comprehensive database seed for MISI Financial Management...",
    );
    console.log("💰 Using Malawi Kwacha (MWK) currency");

    // Clear existing data first
    await clearDatabase(db);

    // Insert categories first (referenced by other tables)
    console.log("📂 Seeding categories...");
    await db
      .insert(categories)
      .values([...defaultIncomeCategories, ...defaultExpenseCategories]);

    // Insert transactions
    console.log("💸 Seeding transactions...");
    await db.insert(transactions).values(dummyTransactions);

    // Insert transaction templates
    console.log("📝 Seeding transaction templates...");
    await db.insert(transactionTemplates).values(defaultTemplates);

    // Insert loans
    console.log("🏦 Seeding loans...");
    await db.insert(loans).values(dummyLoans);

    // Insert loan payments (last, as they reference loans)
    console.log("💳 Seeding loan payments...");
    await db.insert(loanPayments).values(dummyLoanPayments);

    console.log("✅ Database seeded successfully!");

    // Log comprehensive summary
    console.log(`
📊 Comprehensive Seeding Summary:
   💰 Currency: Malawi Kwacha (MWK)
   
   📊 Data Inserted:
   ├── Income Categories: ${defaultIncomeCategories.length}
   ├── Expense Categories: ${defaultExpenseCategories.length}
   ├── Transactions: ${dummyTransactions.length}
   │   ├── Income: ${dummyTransactions.filter((t) => t.type === "income").length}
   │   └── Expense: ${dummyTransactions.filter((t) => t.type === "expense").length}
   ├── Transaction Templates: ${defaultTemplates.length}
   ├── Loans: ${dummyLoans.length}
   │   ├── Borrowed: ${dummyLoans.filter((l) => l.type === "borrowed").length}
   │   └── Lent: ${dummyLoans.filter((l) => l.type === "lent").length}
   └── Loan Payments: ${dummyLoanPayments.length}
   
   💡 Sample Financial Overview:
   ├── Total Income: MWK ${dummyTransactions
     .filter((t) => t.type === "income")
     .reduce((sum, t) => sum + parseFloat(t.amount), 0)
     .toLocaleString()}
   ├── Total Expenses: MWK ${dummyTransactions
     .filter((t) => t.type === "expense")
     .reduce((sum, t) => sum + parseFloat(t.amount), 0)
     .toLocaleString()}
   ├── Total Borrowed: MWK ${dummyLoans
     .filter((l) => l.type === "borrowed")
     .reduce((sum, l) => sum + parseFloat(l.currentBalance), 0)
     .toLocaleString()}
   └── Total Lent: MWK ${dummyLoans
     .filter((l) => l.type === "lent")
     .reduce((sum, l) => sum + parseFloat(l.currentBalance), 0)
     .toLocaleString()}
   
   🚀 Ready to explore your financial data!
   📊 Run: bun run db:studio
    `);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.error("🔍 Error details:", error);
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
