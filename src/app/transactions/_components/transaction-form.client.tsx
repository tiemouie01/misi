"use client";

import { useState } from "react";
import { format } from "date-fns";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  saveToLocalStorage,
  getAvailableRevenueStreams,
  validateTransaction,
  initializeData,
} from "~/lib/financial-utils";
import type { Transaction } from "~/lib/types";

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction: Transaction | null;
  onTransactionSaved: () => void;
}

export function TransactionForm({
  isOpen,
  onOpenChange,
  editingTransaction,
  onTransactionSaved,
}: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  // Initialize form when editing transaction changes
  useState(() => {
    if (editingTransaction) {
      setTransactionType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setSelectedCategory(editingTransaction.category);
      setSelectedRevenueStream(editingTransaction.revenueStream || "");
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
    } else {
      resetForm();
    }
  });

  const resetForm = () => {
    setAmount("");
    setSelectedCategory("");
    setSelectedRevenueStream("");
    setDescription("");
    setDate(new Date());
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

    const data = initializeData();
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

    let updatedTransactions;
    if (editingTransaction) {
      updatedTransactions = data.transactions.map((t) =>
        t.id === editingTransaction.id ? newTransaction : t,
      );
    } else {
      updatedTransactions = [...data.transactions, newTransaction];
    }

    saveToLocalStorage("financial-transactions", updatedTransactions);
    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));

    resetForm();
    onOpenChange(false);
    onTransactionSaved();
  };

  const data = initializeData();
  const availableRevenueStreams = getAvailableRevenueStreams(
    data.transactions,
    data.categories,
  );
  const currentCategories = data.categories.filter(
    (c) => c.type === transactionType,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
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
              <Label htmlFor="revenueStream">Allocate to Revenue Stream</Label>
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
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
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
            onClick={() => onOpenChange(false)}
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
  );
}
