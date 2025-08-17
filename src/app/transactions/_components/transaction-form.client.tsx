"use client";

import { useEffect, useTransition } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import type { Transaction } from "~/server/db/schema";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "~/lib/validations/transactions";
import { addOrUpdateTransaction } from "../actions";

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction: Transaction | null;
  onTransactionSaved: () => void;
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    color: string;
  }[];
  availableRevenueStreams: { id: string; name: string; color: string }[];
  userId: string;
}

export function TransactionForm({
  isOpen,
  onOpenChange,
  editingTransaction,
  onTransactionSaved,
  categories,
  availableRevenueStreams,
  userId,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      id: undefined,
      userId,
      type: "expense",
      amount: 0,
      categoryName: "",
      description: "",
      date: new Date(),
      revenueStream: null,
    },
  });

  const transactionType = form.watch("type");

  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        id: editingTransaction.id,
        userId: editingTransaction.userId,
        type: editingTransaction.type,
        amount: Number(editingTransaction.amount),
        categoryName: editingTransaction.categoryName,
        description: editingTransaction.description,
        date: new Date(editingTransaction.date),
        revenueStream: editingTransaction.revenueStream ?? null,
      });
    } else {
      form.reset({
        id: undefined,
        userId,
        type: "expense",
        amount: 0,
        categoryName: "",
        description: "",
        date: new Date(),
        revenueStream: null,
      });
    }
  }, [editingTransaction, form, userId]);

  const currentCategories = categories.filter(
    (c) => c.type === transactionType,
  );

  const onSubmit = (values: TransactionFormValues) => {
    startTransition(async () => {
      const res = await addOrUpdateTransaction(values);
      if (res && (res as any).success) {
        onOpenChange(false);
        onTransactionSaved();
      }
    });
  };

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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="glass">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card">
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="glass"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card">
                      {currentCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {transactionType === "expense" && (
              <FormField
                control={form.control}
                name="revenueStream"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocate to Revenue Stream</FormLabel>
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select revenue stream" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card">
                        {availableRevenueStreams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.name}>
                            {stream.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {availableRevenueStreams.length === 0
                        ? "Add some income first to create revenue streams."
                        : undefined}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transaction description..."
                      className="glass"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "glass w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="glass-card w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d) => d && field.onChange(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="glass"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="glass-card border-0"
                disabled={isPending}
              >
                {editingTransaction ? "Update" : "Add"} Transaction
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
