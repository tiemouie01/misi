"use client";

import { useEffect, useTransition } from "react";
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
import type { TransactionTemplate } from "~/server/db/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  templateFormSchema,
  type TemplateFormValues,
} from "~/lib/validations/transactions";
import { addOrUpdateTemplate } from "../actions";

interface TemplateFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: TransactionTemplate | null;
  onTemplateSaved: () => void;
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    color: string;
  }[];
  availableRevenueStreams: { id: string; name: string; color: string }[];
  userId: string;
}

export function TemplateForm({
  isOpen,
  onOpenChange,
  editingTemplate,
  onTemplateSaved,
  categories,
  availableRevenueStreams,
  userId,
}: TemplateFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      id: undefined,
      userId,
      type: "expense",
      amount: 0,
      categoryName: "",
      description: "",
      revenueStream: null,
    },
  });

  const transactionType = form.watch("type");

  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        id: editingTemplate.id,
        userId: editingTemplate.userId,
        type: editingTemplate.type,
        amount: Number(editingTemplate.amount),
        categoryName: editingTemplate.categoryName,
        description: editingTemplate.description,
        revenueStream: editingTemplate.revenueStream ?? null,
      });
    } else {
      form.reset({
        id: undefined,
        userId,
        type: "expense",
        amount: 0,
        categoryName: "",
        description: "",
        revenueStream: null,
      });
    }
  }, [editingTemplate, form, userId]);

  const currentCategories = categories.filter(
    (c) => c.type === transactionType,
  );

  const onSubmit = (values: TemplateFormValues) => {
    startTransition(async () => {
      const res = await addOrUpdateTemplate(values);
      if (res && (res as any).success) {
        onOpenChange(false);
        onTemplateSaved();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Edit Template" : "Add New Template"}
          </DialogTitle>
          <DialogDescription>
            Create a template for transactions you make frequently.
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
                    <FormLabel>Default Revenue Stream</FormLabel>
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
                    <Input
                      placeholder="e.g., Coffee, Gas Fill-up, Lunch"
                      className="glass"
                      {...field}
                    />
                  </FormControl>
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
                {editingTemplate ? "Update" : "Add"} Template
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
