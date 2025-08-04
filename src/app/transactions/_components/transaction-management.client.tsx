"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionsList } from "./transactions-list";
import { TemplatesList } from "./templates-list";
import { CategoriesList } from "./categories-list";
import { TransactionForm } from "./transaction-form.client";
import { TemplateForm } from "./template-form.client";
import { saveToLocalStorage, initializeData } from "~/lib/financial-utils";
import type { Transaction, TransactionTemplate } from "~/lib/types";

export function TransactionManagement() {
  // Dialog states
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<TransactionTemplate | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsAddTransactionOpen(true);
  };

  const handleEditTemplate = (template: TransactionTemplate) => {
    setEditingTemplate(template);
    setIsAddTemplateOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    const data = initializeData();
    const updatedTransactions = data.transactions.filter((t) => t.id !== id);
    saveToLocalStorage("financial-transactions", updatedTransactions);
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));
    setRefreshKey((prev) => prev + 1);
  };

  const handleDeleteTemplate = (id: string) => {
    const data = initializeData();
    const updatedTemplates = data.templates.filter((t) => t.id !== id);
    saveToLocalStorage("financial-templates", updatedTemplates);
    setRefreshKey((prev) => prev + 1);
  };

  const handleUseTemplate = (template: TransactionTemplate) => {
    const data = initializeData();
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: template.type,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: new Date(),
      revenueStream: template.revenueStream,
    };

    const updatedTransactions = [...data.transactions, newTransaction];
    saveToLocalStorage("financial-transactions", updatedTransactions);
    window.dispatchEvent(new CustomEvent("financialDataUpdate"));
    setRefreshKey((prev) => prev + 1);
  };

  const handleTransactionSaved = () => {
    setEditingTransaction(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleTemplateSaved = () => {
    setEditingTemplate(null);
    setRefreshKey((prev) => prev + 1);
  };

  const resetTransactionForm = () => {
    setEditingTransaction(null);
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
  };

  return (
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
            <p className="text-muted-foreground">Track your financial flow</p>
          </div>
          <Button
            onClick={() => {
              resetTransactionForm();
              setIsAddTransactionOpen(true);
            }}
            className="glass-card border-0 transition-transform hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        <div key={`transactions-${refreshKey}`}>
          <TransactionsList
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
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
          <Button
            onClick={() => {
              resetTemplateForm();
              setIsAddTemplateOpen(true);
            }}
            className="glass-card border-0 transition-transform hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </div>

        <div key={`templates-${refreshKey}`}>
          <TemplatesList
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-6">
        <h3 className="gradient-text text-2xl font-semibold">
          Transaction Categories
        </h3>

        <CategoriesList />
      </TabsContent>

      {/* Transaction Form Dialog */}
      <TransactionForm
        isOpen={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
        editingTransaction={editingTransaction}
        onTransactionSaved={handleTransactionSaved}
      />

      {/* Template Form Dialog */}
      <TemplateForm
        isOpen={isAddTemplateOpen}
        onOpenChange={setIsAddTemplateOpen}
        editingTemplate={editingTemplate}
        onTemplateSaved={handleTemplateSaved}
      />
    </Tabs>
  );
}
