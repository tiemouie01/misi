"use client";

import { useState } from "react";
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
import {
  saveToLocalStorage,
  getAvailableRevenueStreams,
  initializeData,
} from "~/lib/financial-utils";
import type { TransactionTemplate } from "~/lib/types";

interface TemplateFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: TransactionTemplate | null;
  onTemplateSaved: () => void;
}

export function TemplateForm({
  isOpen,
  onOpenChange,
  editingTemplate,
  onTemplateSaved,
}: TemplateFormProps) {
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRevenueStream, setSelectedRevenueStream] = useState("");
  const [description, setDescription] = useState("");

  // Initialize form when editing template changes
  useState(() => {
    if (editingTemplate) {
      setTransactionType(editingTemplate.type);
      setAmount(editingTemplate.amount.toString());
      setSelectedCategory(editingTemplate.category);
      setSelectedRevenueStream(editingTemplate.revenueStream || "");
      setDescription(editingTemplate.description);
    } else {
      resetForm();
    }
  });

  const resetForm = () => {
    setAmount("");
    setSelectedCategory("");
    setSelectedRevenueStream("");
    setDescription("");
  };

  const handleAddTemplate = () => {
    if (!amount || !selectedCategory || !description) return;
    if (transactionType === "expense" && !selectedRevenueStream) return;

    const data = initializeData();
    const newTemplate: TransactionTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      type: transactionType,
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      description,
      revenueStream:
        transactionType === "expense" ? selectedRevenueStream : undefined,
    };

    let updatedTemplates;
    if (editingTemplate) {
      updatedTemplates = data.templates.map((t) =>
        t.id === editingTemplate.id ? newTemplate : t,
      );
    } else {
      updatedTemplates = [...data.templates, newTemplate];
    }

    saveToLocalStorage("financial-templates", updatedTemplates);

    resetForm();
    onOpenChange(false);
    onTemplateSaved();
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
              <Label htmlFor="revenueStream">Default Revenue Stream</Label>
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
            onClick={() => onOpenChange(false)}
            className="glass"
          >
            Cancel
          </Button>
          <Button onClick={handleAddTemplate} className="glass-card border-0">
            {editingTemplate ? "Update" : "Add"} Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
