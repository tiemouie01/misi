"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { PageHeader } from "~/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Zap,
  ArrowRight,
  Droplets,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  initializeData,
  saveToLocalStorage,
  getCategoryName,
  getCategoryColor,
  getAvailableRevenueStreams,
  validateTransaction,
} from "~/lib/financial-utils";
import type { Transaction, TransactionTemplate, Category } from "~/lib/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog states
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<TransactionTemplate | null>(null);

  // Form states
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  // Load data on component mount
  useEffect(() => {
    const data = initializeData();
    setTransactions(data.transactions);
    setTemplates(data.templates);
    setCategories(data.categories);
  }, []);

  // Save data when it changes
  useEffect(() => {
    saveToLocalStorage("financial-transactions", transactions);
    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));
  }, [transactions]);

  useEffect(() => {
    saveToLocalStorage("financial-templates", templates);
  }, [templates]);

  const resetForm = () => {
    setAmount("");
    setSelectedCategory("");
    setSelectedRevenueStream("");
    setDescription("");
    setDate(new Date());
    setEditingTransaction(null);
    setEditingTemplate(null);
  };

  const handleAddTransaction = () => {
    if (
      !validateTransaction(
        transactionType,
        amount,
        selectedCategory,
        selectedRevenueStream,
      )
    )
      return;

    const newTransaction: Transaction = {
      id: editingTransaction?.id || Date.now().toString(),
      type: transactionType,
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      description,
      date,
      revenueStream:
        transactionType === "expense" ? selectedRevenueStream : undefined,
    };

    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingTransaction.id ? newTransaction : t)),
      );
    } else {
      setTransactions((prev) => [...prev, newTransaction]);
    }

    resetForm();
    setIsAddTransactionOpen(false);
  };

  const handleAddTemplate = () => {
    if (!amount || !selectedCategory || !description) return;
    if (transactionType === "expense" && !selectedRevenueStream) return;

    const newTemplate: TransactionTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      type: transactionType,
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      description,
      revenueStream:
        transactionType === "expense" ? selectedRevenueStream : undefined,
    };

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? newTemplate : t)),
      );
    } else {
      setTemplates((prev) => [...prev, newTemplate]);
    }

    resetForm();
    setIsAddTemplateOpen(false);
  };

  const handleUseTemplate = (template: TransactionTemplate) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: template.type,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: new Date(),
      revenueStream: template.revenueStream,
    };

    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setSelectedCategory(transaction.category);
    setSelectedRevenueStream(transaction.revenueStream || "");
    setDescription(transaction.description);
    setDate(transaction.date);
    setIsAddTransactionOpen(true);
  };

  const handleEditTemplate = (template: TransactionTemplate) => {
    setEditingTemplate(template);
    setTransactionType(template.type);
    setAmount(template.amount.toString());
    setSelectedCategory(template.category);
    setSelectedRevenueStream(template.revenueStream || "");
    setDescription(template.description);
    setIsAddTemplateOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const availableRevenueStreams = getAvailableRevenueStreams(
    transactions,
    categories,
  );
  const currentCategories = categories.filter(
    (c) => c.type === transactionType,
  );

  return (
    <>
      <PageHeader
        title="Transaction Management"
        description="Track your financial flow with detailed transaction records"
      />

      <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
        <Tabs defaultValue="transactions" className="space-y-6">
          <div className="frosted rounded-xl p-2">
            <TabsList className="grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                All Transactions
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Quick Add Templates
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                Categories
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="gradient-text text-2xl font-semibold">
                  All Transactions
                </h3>
                <p className="text-muted-foreground">
                  Track your financial flow
                </p>
              </div>
              <Dialog
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsAddTransactionOpen(true);
                    }}
                    className="glass-card border-0 transition-transform hover:scale-105"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-0 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransaction
                        ? "Edit Transaction"
                        : "Add New Transaction"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTransaction
                        ? "Update the transaction details below."
                        : "Enter the details for your new transaction."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={transactionType}
                          onValueChange={(value: "income" | "expense") =>
                            setTransactionType(value)
                          }
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="glass"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          {currentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <Label htmlFor="revenueStream">
                          Allocate to Revenue Stream
                        </Label>
                        <Select
                          value={selectedRevenueStream}
                          onValueChange={setSelectedRevenueStream}
                        >
                          <SelectTrigger className="glass">
                            <SelectValue placeholder="Select revenue stream" />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            {availableRevenueStreams.map((stream) => (
                              <SelectItem key={stream.id} value={stream.name}>
                                {stream.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableRevenueStreams.length === 0 && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            Add some income first to create revenue streams.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter transaction description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="glass"
                      />
                    </div>

                    <div>
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "glass w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? (
                              format(date, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="glass-card w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(date) => date && setDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTransactionOpen(false)}
                      className="glass"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddTransaction}
                      className="glass-card border-0"
                    >
                      {editingTransaction ? "Update" : "Add"} Transaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="glass-card border-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Revenue Stream</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-muted-foreground py-12 text-center"
                        >
                          <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                            <Droplets className="h-8 w-8" />
                          </div>
                          <p>
                            No transactions yet. Add your first transaction to
                            get started.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                        )
                        .map((transaction) => (
                          <TableRow
                            key={transaction.id}
                            className="border-muted/20 hover:bg-muted/10"
                          >
                            <TableCell>
                              {format(transaction.date, "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.type === "income"
                                    ? "default"
                                    : "destructive"
                                }
                                className="glass"
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`h-3 w-3 rounded-full ${getCategoryColor(transaction.category, categories)}`}
                                />
                                <span>
                                  {getCategoryName(
                                    transaction.category,
                                    categories,
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              {transaction.revenueStream ? (
                                <div className="flex items-center space-x-1">
                                  <ArrowRight className="text-muted-foreground h-3 w-3" />
                                  <span className="text-sm">
                                    {transaction.revenueStream}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell
                              className={
                                transaction.type === "income"
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              {transaction.type === "income" ? "+" : "-"}$
                              {transaction.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleEditTransaction(transaction)
                                  }
                                  className="glass"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteTransaction(transaction.id)
                                  }
                                  className="glass"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="gradient-text text-2xl font-semibold">
                  Quick Add Templates
                </h3>
                <p className="text-muted-foreground">
                  Create templates for common transactions with pre-allocated
                  revenue streams
                </p>
              </div>
              <Dialog
                open={isAddTemplateOpen}
                onOpenChange={setIsAddTemplateOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsAddTemplateOpen(true);
                    }}
                    className="glass-card border-0 transition-transform hover:scale-105"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-0 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Edit Template" : "Add New Template"}
                    </DialogTitle>
                    <DialogDescription>
                      Create a template for transactions you make frequently.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={transactionType}
                          onValueChange={(value: "income" | "expense") =>
                            setTransactionType(value)
                          }
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="glass"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          {currentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <Label htmlFor="revenueStream">
                          Default Revenue Stream
                        </Label>
                        <Select
                          value={selectedRevenueStream}
                          onValueChange={setSelectedRevenueStream}
                        >
                          <SelectTrigger className="glass">
                            <SelectValue placeholder="Select revenue stream" />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            {availableRevenueStreams.map((stream) => (
                              <SelectItem key={stream.id} value={stream.name}>
                                {stream.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="e.g., Coffee, Gas Fill-up, Lunch"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="glass"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTemplateOpen(false)}
                      className="glass"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddTemplate}
                      className="glass-card border-0"
                    >
                      {editingTemplate ? "Update" : "Add"} Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="glass transition-transform duration-300 hover:scale-[1.02]"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getCategoryColor(template.category, categories)}`}
                        />
                        <Badge
                          variant={
                            template.type === "income"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {template.type}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="glass"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="glass"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">{template.description}</h3>
                      <p className="text-muted-foreground text-sm">
                        {template.category}
                      </p>
                      {template.revenueStream && (
                        <div className="text-muted-foreground flex items-center space-x-1 text-sm">
                          <ArrowRight className="h-3 w-3" />
                          <span>{template.revenueStream}</span>
                        </div>
                      )}
                      <div
                        className={`text-lg font-bold ${template.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {template.type === "income" ? "+" : "-"}$
                        {template.amount.toFixed(2)}
                      </div>
                    </div>

                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="glass-card border-0"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Quick Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <Card className="glass">
                <CardContent className="py-8 text-center">
                  <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                    <Droplets className="h-8 w-8" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No templates created yet.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Create templates for common transactions with pre-allocated
                    revenue streams.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <h3 className="gradient-text text-2xl font-semibold">
              Transaction Categories
            </h3>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-emerald-400">
                    Income Categories (Revenue Streams)
                  </CardTitle>
                  <CardDescription>
                    Categories that create revenue streams for expense
                    allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "income")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-3 rounded-lg p-2"
                        >
                          <div
                            className={`h-4 w-4 rounded-full ${category.color}`}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-rose-400">
                    Expense Categories
                  </CardTitle>
                  <CardDescription>
                    Categories for expenses that get allocated to revenue
                    streams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "expense")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-3 rounded-lg p-2"
                        >
                          <div
                            className={`h-4 w-4 rounded-full ${category.color}`}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
