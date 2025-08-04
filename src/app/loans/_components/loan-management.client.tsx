"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { BorrowedLoans } from "./borrowed-loans";
import { LentLoans } from "./lent-loans";
import { LoanForm } from "./loan-form.client";
import { LoanPaymentForm } from "./loan-payment-form.client";
import type { Loan } from "~/lib/types";

export function LoanManagement() {
  // Dialog states
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isLoanPaymentOpen, setIsLoanPaymentOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setIsAddLoanOpen(true);
  };

  const handleDeleteLoan = (id: string) => {
    // This will be handled by the individual loan components
    // triggering a refresh through the refreshKey
    setRefreshKey((prev) => prev + 1);
  };

  const handleMakePayment = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setIsLoanPaymentOpen(true);
  };

  const handleLoanSaved = () => {
    setEditingLoan(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handlePaymentSaved = () => {
    setSelectedLoanForPayment(null);
    setRefreshKey((prev) => prev + 1);
  };

  const resetForm = () => {
    setEditingLoan(null);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="gradient-text mb-2 text-2xl font-semibold">
            Loan Portfolio
          </h3>
          <p className="text-muted-foreground">
            Manage your loans and track payments
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddLoanOpen(true);
          }}
          className="glass-card border-0 transition-transform hover:scale-105"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Loan
        </Button>
      </div>

      {/* Loans List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" key={refreshKey}>
        <BorrowedLoans
          onEditLoan={handleEditLoan}
          onDeleteLoan={handleDeleteLoan}
          onMakePayment={handleMakePayment}
        />

        <LentLoans
          onEditLoan={handleEditLoan}
          onDeleteLoan={handleDeleteLoan}
        />
      </div>

      {/* Loan Form Dialog */}
      <LoanForm
        isOpen={isAddLoanOpen}
        onOpenChange={setIsAddLoanOpen}
        editingLoan={editingLoan}
        onLoanSaved={handleLoanSaved}
      />

      {/* Loan Payment Dialog */}
      <LoanPaymentForm
        isOpen={isLoanPaymentOpen}
        onOpenChange={setIsLoanPaymentOpen}
        selectedLoan={selectedLoanForPayment}
        onPaymentSaved={handlePaymentSaved}
      />
    </>
  );
}
