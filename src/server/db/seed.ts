// Database seeder for MISI Financial Management System
// Populates the database with comprehensive dummy data for multi-user system in Malawi Kwacha (MWK)

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  categories,
  transactions,
  transactionTemplates,
  loans,
  loanPayments,
  userSessions,
  activityLogs,
  usageStatistics,
  systemSettings,
  type NewUser,
  type NewCategory,
  type NewTransaction,
  type NewTransactionTemplate,
  type NewLoan,
  type NewLoanPayment,
  type NewUserSession,
  type NewActivityLog,
  type NewUsageStatistic,
  type NewSystemSetting,
} from "./schema";
import { env } from "~/env";

// Simple CUID-like ID generator for seeding
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `c${timestamp}${randomPart}`;
}

// Dummy users
const dummyUsers: NewUser[] = [
  {
    id: generateCuid(),
    email: "timal0361@gmail.com",
    name: "Timothy Miamba",
    role: "admin",
    lastLoginAt: new Date("2024-12-20T10:30:00Z"),
  },
  {
    id: generateCuid(),
    email: "jane.doe@example.com",
    name: "Jane Doe",
    role: "user",
    lastLoginAt: new Date("2024-12-19T14:22:00Z"),
  },
  {
    id: generateCuid(),
    email: "mike.smith@example.com",
    name: "Mike Smith",
    role: "user",
    lastLoginAt: new Date("2024-12-18T09:15:00Z"),
  },
];

// Helper to get user IDs after they're created
let timothyId: string;

// Generate categories for each user
function createUserCategories(userId: string): NewCategory[] {
  const incomeCategories: NewCategory[] = [
    {
      id: generateCuid(),
      userId,
      name: "Salary",
      type: "income",
      color: "bg-emerald-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Freelance",
      type: "income",
      color: "bg-cyan-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Business",
      type: "income",
      color: "bg-blue-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Investments",
      type: "income",
      color: "bg-indigo-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Other Income",
      type: "income",
      color: "bg-slate-400",
    },
  ];

  const expenseCategories: NewCategory[] = [
    {
      id: generateCuid(),
      userId,
      name: "Housing",
      type: "expense",
      color: "bg-rose-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Transportation",
      type: "expense",
      color: "bg-orange-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Food & Dining",
      type: "expense",
      color: "bg-pink-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Utilities",
      type: "expense",
      color: "bg-purple-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Healthcare",
      type: "expense",
      color: "bg-teal-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Entertainment",
      type: "expense",
      color: "bg-cyan-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Shopping",
      type: "expense",
      color: "bg-violet-400",
    },
    {
      id: generateCuid(),
      userId,
      name: "Other Expenses",
      type: "expense",
      color: "bg-slate-400",
    },
  ];

  return [...incomeCategories, ...expenseCategories];
}

// Generate transaction templates for a user
function createUserTemplates(userId: string): NewTransactionTemplate[] {
  return [
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "7650.00",
      categoryName: "Food & Dining",
      description: "Coffee at café",
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "76500.00",
      categoryName: "Transportation",
      description: "Fuel fill-up",
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "204000.00",
      categoryName: "Food & Dining",
      description: "Monthly groceries",
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "20400.00",
      categoryName: "Food & Dining",
      description: "Lunch at restaurant",
      revenueStream: "Freelance",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "42500.00",
      categoryName: "Entertainment",
      description: "Cinema ticket",
      revenueStream: "Freelance",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "85000.00",
      categoryName: "Utilities",
      description: "Electricity bill",
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "34000.00",
      categoryName: "Transportation",
      description: "Minibus transport",
      revenueStream: "Salary",
    },
  ];
}

// Generate transactions for a user
function createUserTransactions(userId: string): NewTransaction[] {
  return [
    // Income transactions
    {
      id: generateCuid(),
      userId,
      type: "income",
      amount: "450000.00",
      categoryName: "Salary",
      description: "Monthly salary - December 2024",
      date: new Date("2024-12-01"),
    },
    {
      id: generateCuid(),
      userId,
      type: "income",
      amount: "180000.00",
      categoryName: "Freelance",
      description: "Website development project",
      date: new Date("2024-12-05"),
    },
    {
      id: generateCuid(),
      userId,
      type: "income",
      amount: "75000.00",
      categoryName: "Business",
      description: "Online shop sales",
      date: new Date("2024-12-10"),
    },
    {
      id: generateCuid(),
      userId,
      type: "income",
      amount: "25000.00",
      categoryName: "Investments",
      description: "Dividend from shares",
      date: new Date("2024-12-15"),
    },

    // Expense transactions
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "180000.00",
      categoryName: "Housing",
      description: "Monthly rent",
      date: new Date("2024-12-01"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "85000.00",
      categoryName: "Utilities",
      description: "Electricity and water",
      date: new Date("2024-12-02"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "204000.00",
      categoryName: "Food & Dining",
      description: "Monthly groceries",
      date: new Date("2024-12-03"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "76500.00",
      categoryName: "Transportation",
      description: "Fuel for the month",
      date: new Date("2024-12-04"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "65000.00",
      categoryName: "Healthcare",
      description: "Medical checkup",
      date: new Date("2024-12-08"),
      revenueStream: "Freelance",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "42500.00",
      categoryName: "Entertainment",
      description: "Weekend outing",
      date: new Date("2024-12-14"),
      revenueStream: "Business",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "95000.00",
      categoryName: "Shopping",
      description: "Clothing and accessories",
      date: new Date("2024-12-16"),
      revenueStream: "Freelance",
    },
    {
      id: generateCuid(),
      userId,
      type: "expense",
      amount: "34000.00",
      categoryName: "Transportation",
      description: "Public transport",
      date: new Date("2024-12-18"),
      revenueStream: "Salary",
    },
  ];
}

// Generate loans for a user (returns loan IDs for payments)
function createUserLoans(userId: string): {
  loans: NewLoan[];
  loanIds: string[];
} {
  const loan1Id = generateCuid();
  const loan2Id = generateCuid();
  const loan3Id = generateCuid();
  const loan4Id = generateCuid();

  const loans: NewLoan[] = [
    {
      id: loan1Id,
      userId,
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
      id: loan2Id,
      userId,
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
      id: loan3Id,
      userId,
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
      id: loan4Id,
      userId,
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

  return { loans, loanIds: [loan1Id, loan2Id, loan3Id, loan4Id] };
}

// Generate loan payments for user loans
function createUserLoanPayments(
  userId: string,
  loanIds: string[],
): NewLoanPayment[] {
  const loan1Id = loanIds[0]!;
  const loan2Id = loanIds[1]!;
  const loan4Id = loanIds[3]!; // Skip loan3Id (index 2)

  return [
    {
      id: generateCuid(),
      userId,
      loanId: loan1Id,
      amount: "89250.00",
      principalAmount: "65000.00",
      interestAmount: "24250.00",
      date: new Date("2024-12-01"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      loanId: loan2Id,
      amount: "45900.00",
      principalAmount: "30600.00",
      interestAmount: "15300.00",
      date: new Date("2024-12-01"),
      revenueStream: "Business",
    },
    {
      id: generateCuid(),
      userId,
      loanId: loan4Id,
      amount: "45900.00",
      principalAmount: "36720.00",
      interestAmount: "9180.00",
      date: new Date("2024-12-01"),
      revenueStream: "Freelance",
    },
    {
      id: generateCuid(),
      userId,
      loanId: loan1Id,
      amount: "89250.00",
      principalAmount: "66300.00",
      interestAmount: "22950.00",
      date: new Date("2024-11-01"),
      revenueStream: "Salary",
    },
    {
      id: generateCuid(),
      userId,
      loanId: loan2Id,
      amount: "45900.00",
      principalAmount: "31200.00",
      interestAmount: "14700.00",
      date: new Date("2024-11-01"),
      revenueStream: "Business",
    },
  ];
}

// Generate user sessions for a user
function createUserSessions(userId: string): NewUserSession[] {
  return [
    {
      id: generateCuid(),
      userId,
      sessionToken: generateCuid(),
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      expiresAt: new Date("2025-01-20T10:30:00Z"),
    },
    {
      id: generateCuid(),
      userId,
      sessionToken: generateCuid(),
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      expiresAt: new Date("2025-01-15T14:22:00Z"),
    },
  ];
}

// Generate activity logs for a user
function createUserActivityLogs(userId: string): NewActivityLog[] {
  return [
    {
      id: generateCuid(),
      userId,
      activityType: "login",
      entityType: null,
      entityId: null,
      description: "User logged in successfully",
      metadata: { loginMethod: "email", deviceType: "desktop" },
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      id: generateCuid(),
      userId,
      activityType: "transaction_created",
      entityType: "transaction",
      entityId: "transaction_123",
      description: "Created new income transaction",
      metadata: { amount: "450000.00", type: "income", category: "Salary" },
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      id: generateCuid(),
      userId,
      activityType: "loan_created",
      entityType: "loan",
      entityId: "loan_456",
      description: "Created new motorcycle loan",
      metadata: {
        amount: "2550000.00",
        type: "borrowed",
        name: "Motorcycle Loan",
      },
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      id: generateCuid(),
      userId,
      activityType: "category_created",
      entityType: "category",
      entityId: "category_789",
      description: "Created new expense category",
      metadata: {
        name: "Transportation",
        type: "expense",
        color: "bg-orange-400",
      },
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    },
  ];
}

// Create usage statistics data
function createUsageStatistics(): NewUsageStatistic[] {
  return [
    {
      id: generateCuid(),
      date: "2024-12-18",
      activeUsers: 15,
      newUsers: 3,
      totalLogins: 42,
      transactionsCreated: 28,
      loansCreated: 5,
      categoriesCreated: 12,
      templatesCreated: 8,
      totalRevenue: "2340000.00",
      totalExpenses: "1890000.00",
    },
    {
      id: generateCuid(),
      date: "2024-12-19",
      activeUsers: 18,
      newUsers: 2,
      totalLogins: 38,
      transactionsCreated: 31,
      loansCreated: 3,
      categoriesCreated: 7,
      templatesCreated: 4,
      totalRevenue: "2580000.00",
      totalExpenses: "2120000.00",
    },
    {
      id: generateCuid(),
      date: "2024-12-20",
      activeUsers: 22,
      newUsers: 4,
      totalLogins: 51,
      transactionsCreated: 35,
      loansCreated: 7,
      categoriesCreated: 15,
      templatesCreated: 11,
      totalRevenue: "3100000.00",
      totalExpenses: "2450000.00",
    },
  ];
}

// Create system settings
function createSystemSettings(): NewSystemSetting[] {
  return [
    {
      id: generateCuid(),
      key: "app_name",
      value: "MISI Financial Management",
      description: "Application name displayed in the UI",
      isPublic: true,
    },
    {
      id: generateCuid(),
      key: "default_currency",
      value: "MWK",
      description: "Default currency for the application",
      isPublic: true,
    },
    {
      id: generateCuid(),
      key: "max_categories_per_user",
      value: "50",
      description: "Maximum number of categories a user can create",
      isPublic: false,
    },
    {
      id: generateCuid(),
      key: "session_timeout_minutes",
      value: "480",
      description: "User session timeout in minutes (8 hours)",
      isPublic: false,
    },
    {
      id: generateCuid(),
      key: "enable_loan_notifications",
      value: "true",
      description: "Enable notifications for loan payment reminders",
      isPublic: true,
    },
    {
      id: generateCuid(),
      key: "admin_email",
      value: "timal0361@gmail.com",
      description: "Administrator email for system notifications",
      isPublic: false,
    },
  ];
}

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
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(activityLogs);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(userSessions);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(usageStatistics);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(systemSettings);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  await db.delete(users);

  console.log("✨ Database cleared successfully!");
}

async function seed() {
  // Initialize database connection
  const connection = postgres(env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    console.log(
      "🌱 Starting comprehensive multi-user database seed for MISI Financial Management...",
    );
    console.log("👥 Multi-user system with administrative features");
    console.log("💰 Using Malawi Kwacha (MWK) currency");

    // Clear existing data first
    await clearDatabase(db);

    // Insert users first (all other data references users)
    console.log("👤 Seeding users...");
    const insertedUsers = await db.insert(users).values(dummyUsers).returning();

    // Extract user IDs for subsequent operations
    timothyId =
      insertedUsers.find((u) => u.email === "timal0361@gmail.com")?.id ?? "";

    console.log(
      `   ✓ Created ${insertedUsers.length} users including Timothy Miamba (Admin)`,
    );

    // Insert system settings (global settings)
    console.log("⚙️  Seeding system settings...");
    const systemSettingsData = createSystemSettings();
    await db.insert(systemSettings).values(systemSettingsData);
    console.log(`   ✓ Created ${systemSettingsData.length} system settings`);

    // Insert usage statistics (global analytics)
    console.log("📊 Seeding usage statistics...");
    const usageStatsData = createUsageStatistics();
    await db.insert(usageStatistics).values(usageStatsData);
    console.log(`   ✓ Created ${usageStatsData.length} daily usage statistics`);

    // Create user-specific data for each user
    const allCategories: NewCategory[] = [];
    const allTransactions: NewTransaction[] = [];
    const allTemplates: NewTransactionTemplate[] = [];
    const allLoans: NewLoan[] = [];
    const allLoanPayments: NewLoanPayment[] = [];
    const allUserSessions: NewUserSession[] = [];
    const allActivityLogs: NewActivityLog[] = [];

    for (const user of insertedUsers) {
      console.log(`📁 Creating data for ${user.name}...`);

      // Categories
      const userCategories = createUserCategories(user.id);
      allCategories.push(...userCategories);

      // Transactions
      const userTransactions = createUserTransactions(user.id);
      allTransactions.push(...userTransactions);

      // Templates
      const userTemplates = createUserTemplates(user.id);
      allTemplates.push(...userTemplates);

      // Loans and payments
      const { loans: userLoans, loanIds } = createUserLoans(user.id);
      const userLoanPayments = createUserLoanPayments(user.id, loanIds);
      allLoans.push(...userLoans);
      allLoanPayments.push(...userLoanPayments);

      // Sessions
      const userSessions = createUserSessions(user.id);
      allUserSessions.push(...userSessions);

      // Activity logs
      const userActivityLogs = createUserActivityLogs(user.id);
      allActivityLogs.push(...userActivityLogs);
    }

    // Insert all user-specific data
    console.log("📂 Seeding categories for all users...");
    await db.insert(categories).values(allCategories);
    console.log(
      `   ✓ Created ${allCategories.length} categories across all users`,
    );

    console.log("💸 Seeding transactions for all users...");
    await db.insert(transactions).values(allTransactions);
    console.log(
      `   ✓ Created ${allTransactions.length} transactions across all users`,
    );

    console.log("📝 Seeding transaction templates for all users...");
    await db.insert(transactionTemplates).values(allTemplates);
    console.log(
      `   ✓ Created ${allTemplates.length} templates across all users`,
    );

    console.log("🏦 Seeding loans for all users...");
    await db.insert(loans).values(allLoans);
    console.log(`   ✓ Created ${allLoans.length} loans across all users`);

    console.log("💳 Seeding loan payments for all users...");
    await db.insert(loanPayments).values(allLoanPayments);
    console.log(
      `   ✓ Created ${allLoanPayments.length} loan payments across all users`,
    );

    console.log("🔐 Seeding user sessions...");
    await db.insert(userSessions).values(allUserSessions);
    console.log(`   ✓ Created ${allUserSessions.length} active user sessions`);

    console.log("📋 Seeding activity logs...");
    await db.insert(activityLogs).values(allActivityLogs);
    console.log(`   ✓ Created ${allActivityLogs.length} activity log entries`);

    console.log("✅ Multi-user database seeded successfully!");

    // Log comprehensive summary
    const totalIncomeTransactions = allTransactions.filter(
      (t) => t.type === "income",
    ).length;
    const totalExpenseTransactions = allTransactions.filter(
      (t) => t.type === "expense",
    ).length;
    const totalBorrowedLoans = allLoans.filter(
      (l) => l.type === "borrowed",
    ).length;
    const totalLentLoans = allLoans.filter((l) => l.type === "lent").length;

    console.log(`
📊 Comprehensive Multi-User Seeding Summary:
   💰 Currency: Malawi Kwacha (MWK)
   👥 System: Multi-user with administrative features
   
   📊 Data Inserted:
   ├── Users: ${insertedUsers.length}
   │   ├── Administrators: ${insertedUsers.filter((u) => u.role === "admin").length}
   │   └── Regular Users: ${insertedUsers.filter((u) => u.role === "user").length}
   ├── Categories: ${allCategories.length} (${allCategories.length / insertedUsers.length} per user avg)
   ├── Transactions: ${allTransactions.length}
   │   ├── Income: ${totalIncomeTransactions}
   │   └── Expense: ${totalExpenseTransactions}
   ├── Transaction Templates: ${allTemplates.length}
   ├── Loans: ${allLoans.length}
   │   ├── Borrowed: ${totalBorrowedLoans}
   │   └── Lent: ${totalLentLoans}
   ├── Loan Payments: ${allLoanPayments.length}
   ├── User Sessions: ${allUserSessions.length}
   ├── Activity Logs: ${allActivityLogs.length}
   ├── Usage Statistics: ${usageStatsData.length} days
   └── System Settings: ${systemSettingsData.length}
   
   👑 Administrative User:
   ├── Name: Timothy Miamba
   ├── Email: timal0361@gmail.com
   ├── Role: Admin
   └── ID: ${timothyId}
   
   💡 Sample Financial Overview (All Users):
   ├── Total Income Transactions: ${totalIncomeTransactions}
   ├── Total Expense Transactions: ${totalExpenseTransactions}
   ├── Total Borrowed Loans: ${totalBorrowedLoans}
   ├── Total Lent Loans: ${totalLentLoans}
   └── Active User Sessions: ${allUserSessions.length}
   
   🚀 Ready to explore your multi-user financial system!
   📊 Run: bun run db:studio
   🔐 Admin Access: timal0361@gmail.com
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
